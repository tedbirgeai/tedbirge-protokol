import { isRelayEnabled } from "@/shell/relay";
import { canAcceptPeer, setLicenseTier } from "@/lib/peer-limit";

import { chunkPayload, ingestChunk, isChunkFrame, laneSchedule } from "@/kernel/multipath";
import { forgetNode, observeNode } from "@/lib/mesh/dht";
import { liveNextHop } from "@/kernel/routing-live";
import { transitConfig } from "@/lib/transit-config";
/**
 * Tarayıcı Düğümü (Browser Node) — v2 mimarisi
 * ------------------------------------------------------------------
 * Cep telefonu / tablet / bilgisayarı fiziksel donanım kurmadan
 * gerçek bir Tedbirge düğümüne dönüştürür.
 *
 * v2 ile gelenler (mimari kararlar 5–11):
 *  - Kalıcı kuyruk IndexedDB'de (30 gün off-grid hedefi, öncelikli budama)
 *  - Her paket Ed25519 ile imzalanır; imzasız/bozuk paket röle EDİLMEZ
 *  - Gövde X25519+AES-256-GCM ile uçtan uca şifrelidir; ara röleler
 *    yalnızca yönlendirme başlığını görür
 *  - Lamport mantıksal saati + SHA-256 pktId ile mükerrer paket engelleme
 *
 * Tarayıcı sandbox sınırı: LoRa/HaLow gibi radyolar doğrudan sürülemez;
 * bunlar Taşıyıcı Köprüsü (carrier-bridge.ts) üzerinden veri düzlemine
 * bağlanır.
 */

import { supabase } from "@/integrations/supabase/client";
import { getAlias, setAlias } from "@/lib/chat/profile";
import { assertNoEgress } from "@/lib/egress-guard";
import { ensureIdentity, type Identity } from "@/lib/crypto/identity";
import {
  createEnvelope,
  decodeEnvelope,
  defaultPriority,
  encodeEnvelope,
  forwardEnvelope,
  openEnvelope,
  verifyEnvelope,
  witnessClock,
  TTL_EXHAUSTED_NOTICE,
  type EnvelopeKind,
  type MeshEnvelopeV2,
} from "@/lib/mesh-envelope";
import {
  alreadySeen,
  appendEvent,
  deletePacket,
  getPackets,
  markSeen,
  migrateLegacyQueue,
  putPacket,
  requestPersistentStorage,
  type Priority,
} from "@/lib/store/idb";
import { pruneOutbox } from "@/lib/store/pruning";
import { observePeerKey, trustStatusOf, type TrustStatus } from "@/lib/peer-trust";
import { getPeer } from "@/lib/store/idb";
import {
  recordDrop,
  recordQueue,
  recordRelay,
  recordRtt,
  recordRx,
  recordTx,
} from "@/lib/diagnostics";

const ID_KEY = "tedbirge.browser-node.id";
const PERSON_ID_KEY = "tedbirge.person.id";
const CHANNEL = "tedbirge-mesh-v1";
/** Yerel keşif kanalı: aynı cihaz/aynı origin üzerindeki sekme ve PWA örnekleri. */
const LOCAL_CHANNEL = "tedbirge-local-mesh-v1";
const LOCAL_ANNOUNCE_MS = 4_000;
/** Dizin sorgusu önbelleği: başarılı sonuç 5 dk, boş sonuç 20 sn saklanır. */
const DEVICE_CACHE_MS = 300_000;
const DEVICE_CACHE_MISS_MS = 20_000;

const MAX_TTL = 4;
/** Bulutsuz (Katman B) el sıkışma için yerel ajan WebSocket sinyalleşme adresleri. */
const LAN_SIGNAL_PORT = 8787;
const LAN_RETRY_MS = 6_000;
const LAN_ANNOUNCE_MS = 3_000;

/**
 * Yalnız anlık anlam taşıyan kontrol paketleri kalıcı kuyruğa veya bulut
 * store-and-forward hattına ASLA yazılmaz. Aksi halde eski ping/call/presence
 * paketleri her kuyruk turunda yeniden üretilerek röleyi kilitler.
 */
const TRANSIENT_KINDS = new Set<EnvelopeKind>(["ping", "pong", "signal", "presence", "session"]);

/**
 * Arama sinyali kalıcı sohbet verisi değildir; ancak doğrudan kanal kısa süreli
 * kurulamadığında karşı cihaza ulaşabilmesi için bulut rölede taşınır. Gövde
 * zaman damgası arama motorunda denetlendiğinden eski çağrı yeniden çalmaz.
 */
const NEVER_ENQUEUE_KINDS = new Set<EnvelopeKind>([...TRANSIENT_KINDS, "call"]);

/**
 * Aynı Wi-Fi / hotspot ağındaki saha geçidini bulmak için denenecek adresler.
 * Bluetooth ve internet kapalı olsa da bu adreslerden biri açıksa cihazlar
 * saniyeler içinde birbirini bulur. Ajan yoksa denemeler sessizce düşer.
 */
/** Sayfa HTTPS ile servis ediliyorsa karma içerik hatasını önlemek için wss kullanılır. */
function wsScheme(): "ws" | "wss" {
  return typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
}

function lanSignalUrls(): string[] {
  const urls = new Set<string>();
  const ws = wsScheme();
  const host = typeof location !== "undefined" ? location.hostname : "";
  // HTTPS sayfasından düz ws:// bağlantısı tarayıcı tarafından engellenir ve
  // adres çubuğunda "güvenli değil" uyarısı doğurur; bu durumda yalnızca
  // sayfanın kendi origin'i üzerinden güvenli sinyalleşme denenir.
  if (ws === "wss") {
    const isPrivateHost =
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.endsWith(".local");
    if (isPrivateHost) urls.add(`wss://${host}:${LAN_SIGNAL_PORT}`);
    return Array.from(urls);
  }

  // 1) Sayfanın servis edildiği yerel adres (saha AP / yerel ajan aynı makinede).
  if (host && !/^(localhost|127\.0\.0\.1)$/.test(host) && !host.includes("lovable")) {
    urls.add(`${ws}://${host}:${LAN_SIGNAL_PORT}`);
  }
  // 2) Yerel ajan aynı cihazda çalışıyorsa.
  urls.add(`${ws}://localhost:${LAN_SIGNAL_PORT}`);
  // 3) mDNS adı ve yaygın yönlendirici/hotspot geçit adresleri.
  urls.add(`${ws}://tedbirge-gateway.local:${LAN_SIGNAL_PORT}`);
  for (const gw of ["192.168.4.1", "192.168.43.1", "172.20.10.1", "192.168.1.1", "192.168.0.1"]) {
    urls.add(`${ws}://${gw}:${LAN_SIGNAL_PORT}`);
  }
  return Array.from(urls);
}

/** Teslim hattındaki her sessiz hata Türkçe tek cümleyle günlüğe düşer. */
async function logRelayIssue(message: string) {
  try {
    const { logSync } = await import("@/lib/chat/sync-log");
    logSync("hata", "teslim", message);
  } catch {
    /* günlük yazılamadıysa akışı durdurmayız */
  }
}

/** Uygulama katmanı (sohbet, arama, eşitleme) paket dinleyicisi. */
export type MeshAppHandler = (kind: EnvelopeKind, from: string, body: unknown) => void;

let appHandler: MeshAppHandler | null = null;

/** Sohbet/arama motorları bu kancayla mesh veri düzlemine bağlanır. */
export function setMeshAppHandler(fn: MeshAppHandler | null) {
  appHandler = fn;
}

/** Uygulama katmanına iletilecek paket türleri. */
const APP_KINDS: EnvelopeKind[] = [
  "chat",
  "receipt",
  "call",
  "media",
  "sync",
  "presence",
  "session",
  "text",
  "alert",
  "app",
];

export type PeerInfo = {
  nodeId: string;
  state: RTCPeerConnectionState;
  direct: boolean;
  fingerprint?: string;
  verified?: boolean;
  /** Parmak izi güven durumu: unknown | auto | manual | changed. */
  trust?: TrustStatus;
  signPublic?: string;
};

/** Sinyalleşmenin hangi yoldan yürüdüğü: bulut → yerel LAN → eş rölesi. */
export type DiscoveryMode = "cloud" | "local" | "relay" | "none";

export type BrowserNodeState = {
  running: boolean;
  nodeId: string;
  online: boolean;
  peers: PeerInfo[];
  queued: number;
  lastHeartbeatAt: string | null;
  lastRelayAt: string | null;
  rttMs: number | null;
  error: string | null;
  discovery: DiscoveryMode;
  /** Ed25519 kimlik parmak izi — eş doğrulaması için. */
  fingerprint: string;
  /** İmzası doğrulanamadığı için düşürülen paket sayısı. */
  droppedUnsigned: number;
  /** Kullanıcıya gösterilecek son otonom durum metni (ör. menzil dışı). */
  notice: string | null;
};

/** Geriye dönük tip (v1 zarfı) — yalnızca eski istemcileri tanımak için. */
export type MeshEnvelope = {
  id: string;
  from: string;
  to: string | "*";
  ttl: number;
  kind: string;
  body: unknown;
  at: number;
};

type Hello = { t: "hello"; nodeId: string; spk: string; bpk: string; pid?: string };
type QueuedIntent = {
  t: "intent";
  kind: EnvelopeKind;
  to: string | "*";
  payload: unknown;
  priority: Priority;
};
type QueuedForward = { t: "fwd"; env: MeshEnvelopeV2 };
type QueuedItem = QueuedIntent | QueuedForward;

function randomId(prefix: string) {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function getBrowserNodeId() {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = randomId("mob");
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
}

/**
 * Kişi kimliği GSM NUMARASINA çıpalanır: aynı numara Chrome, Edge, PWA,
 * iOS ve Android'de aynı TBG kodunu üretir. Düğüm kimliği ise cihaz
 * başına ayrı kalır (WhatsApp'taki hesap + bağlı cihaz modeli).
 */
export function getPersonId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PERSON_ID_KEY) ?? getBrowserNodeId();
  } catch {
    return getBrowserNodeId();
  }
}

export async function syncPersonIdentity(): Promise<string> {
  if (typeof window === "undefined") return "";
  try {
    // (1) Birincil çıpa: doğrulanmış telefon numarası — çevrimdışı da çalışır.
    const { getAnchorPhone, anchorIdentityToPhone } = await import("@/lib/chat/anchor");
    const phone = await getAnchorPhone();
    if (phone) {
      const { personId, previous, changed } = await anchorIdentityToPhone(phone);
      if (changed && previous) {
        // Geriye dönük göç: eski cihaz tabanlı kimliğe bağlı kayıtlar
        // yeni kişi kimliğine taşınır, hiçbir veri silinmez.
        const { migrateIdentity } = await import("@/lib/chat/merge");
        await migrateIdentity(previous, personId).catch(() => undefined);
      }
      const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const fullName =
        typeof data.user?.user_metadata?.["full_name"] === "string"
          ? (data.user.user_metadata["full_name"] as string).trim()
          : "";
      if (fullName && !getAlias()) setAlias(fullName);
      return personId;
    }

    // (2) Numara yoksa hesap kimliğinden türet (eski davranış).
    const { data } = await supabase.auth.getUser();
    if (!data.user) return getPersonId();
    // Görünen ad hesap profilinden gelir; yerel kayıt yalnız çevrimdışı önbellektir.
    const fullName =
      typeof data.user.user_metadata?.["full_name"] === "string"
        ? data.user.user_metadata["full_name"].trim()
        : "";
    if (fullName && !getAlias()) setAlias(fullName);
    const source = new TextEncoder().encode(`tedbirge/person/v1:${data.user.id}`);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", source));
    const code = Array.from(digest.slice(0, 6), (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const personId = `TBG-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
    window.localStorage.setItem(PERSON_ID_KEY, personId);
    return personId;
  } catch {
    return getPersonId();
  }
}

/**
 * ICE yapılandırması. Mobil operatörlerde CGNAT arkasındaki iki cihaz
 * yalnız STUN ile buluşamaz; TURN tanımlıysa aktarmalı hat kurulur.
 * TURN bilgileri ortam değişkeninden gelir, koda gömülmez.
 */
export function buildMeshIce(): RTCConfiguration {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const env = import.meta.env as Record<string, string | undefined>;
  const turnUrl = env["VITE_TURN_URL"];
  if (turnUrl) {
    servers.push({
      urls: turnUrl
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean),
      username: env["VITE_TURN_USERNAME"],
      credential: env["VITE_TURN_CREDENTIAL"],
    });
  }
  return { iceServers: servers, iceCandidatePoolSize: 4, iceTransportPolicy: "all" };
}

/**
 * Cihazın gerçekte kullandığı taşıyıcıyı raporlar (uydurma değer yok).
 */
export function detectCarrier(): "wifi" | "cellular" | "ethernet" {
  const conn = (navigator as unknown as { connection?: { type?: string; effectiveType?: string } })
    .connection;
  const type = conn?.type;
  if (type === "cellular") return "cellular";
  if (type === "ethernet") return "ethernet";
  if (type === "wifi") return "wifi";
  if (conn?.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType))
    return "cellular";
  return "wifi";
}

export class BrowserNode {
  readonly nodeId = getBrowserNodeId();
  private licenseKey: string;
  private get demoMode() {
    return !this.licenseKey;
  }
  private onState: (s: BrowserNodeState) => void;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private cloudUp = false;
  private cloudReady: Promise<void> | null = null;
  private resolveCloudReady: (() => void) | null = null;
  private localBus: BroadcastChannel | null = null;
  private localSeen = new Map<string, number>();
  private localTimer: ReturnType<typeof setInterval> | null = null;
  private lanSocket: WebSocket | null = null;
  private lanTimer: ReturnType<typeof setInterval> | null = null;
  private peers = new Map<string, { pc: RTCPeerConnection; dc: RTCDataChannel | null }>();
  /** Teklif gelmeden ulaşan ICE adayları kaybolmaz; uzak açıklamadan sonra uygulanır. */
  private pendingPeerIce = new Map<string, RTCIceCandidateInit[]>();
  /** Eş başına son canlılık damgası — hayalet düğüm temizliği için. */
  private peerSeen = new Map<string, number>();
  private gcTimer: ReturnType<typeof setInterval> | null = null;
  private peerKeys = new Map<
    string,
    { spk: string; bpk: string; fingerprint: string; verified: boolean; trust: TrustStatus }
  >();
  private timer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  /** Bulut yedek röle (store-and-forward) yoklama zamanlayıcısı. */
  private relayTimer: ReturnType<typeof setInterval> | null = null;
  private relayBusy = false;
  private relayAck: string[] = [];
  private relayFailures = 0;
  private flushBusy = false;
  /** Kuyruk yeniden deneme gecikmesi (üstel geri çekilme). */
  private queueBackoff = 0;
  /** Hedef → bağlı cihazlar önbelleği; dizin sorgusu tekrarını önler. */
  private deviceCache = new Map<
    string,
    { devices: { nodeId: string; boxPublic: string }[]; until: number }
  >();

  private identity: Identity | null = null;
  /** PHY veri düzlemi köprüsü — IP yokken zarfları LoRa/HaLow'a yazar. */
  private carrierSend: ((raw: string, priority: Priority) => boolean) | null = null;
  private state: BrowserNodeState;

  constructor(licenseKey: string | undefined, onState: (s: BrowserNodeState) => void) {
    this.licenseKey = licenseKey ?? "";
    setLicenseTier(this.licenseKey ? "ENTERPRISE" : "FREE");
    this.onState = onState;

    this.state = {
      running: false,
      nodeId: this.nodeId,
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      peers: [],
      queued: 0,
      lastHeartbeatAt: null,
      lastRelayAt: null,
      rttMs: null,
      error: null,
      discovery: "none",
      fingerprint: "",
      droppedUnsigned: 0,
      notice: null,
    };
  }

  private emit(patch: Partial<BrowserNodeState>) {
    this.state = {
      ...this.state,
      ...patch,
      peers: this.snapshotPeers(),
      discovery: patch.discovery ?? this.discoveryMode(),
    };
    this.onState(this.state);
  }

  private async refreshQueueCount() {
    const rows = await getPackets();
    const oldest = rows.reduce<number | null>(
      (min, r) => (min === null || r.ts < min ? r.ts : min),
      null,
    );
    recordQueue(rows.length, oldest);
    this.emit({ queued: rows.length });
  }

  private discoveryMode(): DiscoveryMode {
    if (!this.state.running) return "none";
    if (this.cloudUp && this.state.online) return "cloud";
    if (this.localBus) return "local";
    if (this.snapshotPeers().some((p) => p.direct)) return "relay";
    return "none";
  }

  private snapshotPeers(): PeerInfo[] {
    return Array.from(this.peers.entries()).map(([nodeId, p]) => {
      const keys = this.peerKeys.get(nodeId);
      return {
        nodeId,
        state: p.pc.connectionState,
        direct: p.dc?.readyState === "open",
        fingerprint: keys?.fingerprint,
        verified: keys?.verified,
        trust: keys?.trust,
        signPublic: keys?.spk,
      };
    });
  }

  async start() {
    if (this.state.running) return;
    this.emit({ running: true, error: null });

    // Local-first temel: kalıcı depolama izni + eski kuyruğun göçü.
    void requestPersistentStorage();
    await migrateLegacyQueue();
    this.identity = await ensureIdentity(this.nodeId);
    this.emit({ fingerprint: this.identity.fingerprint });
    void this.refreshQueueCount();

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    // Bildirim (Web Push) geldiğinde bekleyen zarfları anında çek.
    window.addEventListener("tedbirge:relay-poll-now", () => void this.pollRelay());

    this.startLocalDiscovery();
    this.startLanSignaling();

    this.cloudReady = new Promise<void>((resolve) => {
      this.resolveCloudReady = resolve;
    });
    // Aynı konuya ait eski kanal (sıcak yeniden yükleme, ikinci başlatma)
    // kalmışsa kaldırılır: abone olunmuş kanala dinleyici eklenemez.
    try {
      for (const ch of supabase.getChannels()) {
        if (ch.topic === `realtime:${CHANNEL}` || ch.topic === CHANNEL) {
          await supabase.removeChannel(ch);
        }
      }
    } catch {
      /* kanal listesi alınamadı: yeni kanal yine de kurulur */
    }
    this.channel = supabase.channel(CHANNEL, {
      config: { broadcast: { self: false }, presence: { key: this.nodeId } },
    });

    this.channel
      .on("presence", { event: "sync" }, () => void this.dialNewPeers())
      .on("broadcast", { event: "signal" }, ({ payload }) => void this.onSignal(payload))
      .on("broadcast", { event: "mesh" }, ({ payload }) => {
        const raw = (payload as { envelope?: unknown } | null)?.envelope;
        if (typeof raw === "string") void this.onMeshMessage(raw, "cloud-realtime");
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          this.cloudUp = true;
          this.resolveCloudReady?.();
          this.resolveCloudReady = null;
          await this.channel?.track({
            nodeId: this.nodeId,
            personId: getPersonId() || this.nodeId,
            at: Date.now(),
          });
          void this.dialNewPeers();
          this.emit({});
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          this.cloudUp = false;
          this.resolveCloudReady?.();
          this.resolveCloudReady = null;
          this.emit({});
        }
      });

    await this.heartbeat();
    this.timer = setInterval(() => {
      void this.heartbeat();
      // Bekleyen mesajlar yalnız olay anında değil, düzenli olarak da denenir.
      void this.flushQueue();
    }, 60_000);
    this.scheduleQueueFlush();
    // Hayalet düğüm temizliği: sessizleşen eş bağlantısı kapatılır ve
    // DHT dizininden düşürülür (yanlış rota üretmesin).
    this.gcTimer = setInterval(() => this.sweepStalePeers(), transitConfig().heartbeatMs);

    // Bulut yedek röle: alıcı kapalıyken mesaj kaybolmaz.
    void this.publishDirectory();
    void this.pollRelay();
    this.scheduleRelayPoll();
  }

  /** Kendi genel anahtarlarımızı rehbere yazar (ilk temas için gerekir). */
  private async publishDirectory() {
    if (!this.identity) return;
    const { publishRelayKeys } = await import("@/lib/relay-cloud");
    // navigator.onLine yanılabilir (captive portal, arka plandaki PWA, WebView).
    // Denemeyi bayrağa bağlamayız: istek başarılıysa çevrimiçi olduğumuzu
    // gerçek sonuçtan öğreniriz.
    const ok = await publishRelayKeys({
      nodeId: this.nodeId,
      personId: getPersonId() || this.nodeId,
      signPublic: this.identity.signPublic,
      boxPublic: this.identity.boxPublic,
    });
    if (ok && !this.state.online) this.emit({ online: true });
  }

  /** Bulutta bekleyen zarfları indirir ve normal mesh işleme hattına verir. */
  private async pollRelay() {
    if (this.relayBusy) return;
    this.relayBusy = true;
    try {
      const { pullRelayEnvelopes } = await import("@/lib/relay-cloud");
      // Önceki başarılı turun onayları yeni çekme isteğine eklenir. Böylece
      // teslim + onay için iki ayrı HTTP isteği yerine tur başına tek istek olur.
      const ack = this.relayAck;
      const items = await pullRelayEnvelopes(this.nodeId, ack, getPersonId() || undefined);
      if (items === null) {
        this.relayFailures = Math.min(this.relayFailures + 1, 5);
        void logRelayIssue("Bulut posta kutusu okunamadı; birazdan yeniden denenecek.");
        return;
      }
      this.relayFailures = 0;
      // Gerçek kanıt: istek döndüyse ağ vardır. navigator.onLine yanılsa bile
      // teslim hattı kilitlenmez.
      if (!this.state.online) this.emit({ online: true });
      this.relayAck = [];
      if (!items.length) return;
      for (const item of items) {
        await this.onMeshMessage(item.envelope, "cloud-relay");
      }
      this.relayAck = items.map((i) => i.pktId);
      this.emit({ lastRelayAt: new Date().toISOString() });
    } catch (error) {
      this.relayFailures = Math.min(this.relayFailures + 1, 5);
      void logRelayIssue(
        `Bekleyen mesajlar alınamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`,
      );
    } finally {
      this.relayBusy = false;
    }
  }

  /**
   * Sabit aralıklı toplu yoklama yerine şaşırtılmış, hata halinde kademeli
   * zamanlama kullanılır. Aynı ağdaki cihazlar aynı milisaniyede yük bindirmez.
   */
  private scheduleRelayPoll() {
    if (this.relayTimer) clearTimeout(this.relayTimer);
    // Sohbet açıkken yedek röle gecikmesi birkaç saniyeyi geçmez. Arka planda
    // pil/veri tüketimini azaltmak için daha seyrek; hatada kademeli beklenir.
    const foreground = typeof document !== "undefined" && document.visibilityState === "visible";
    const base = (foreground ? 4_000 : 15_000) * 2 ** this.relayFailures;
    const delay = Math.min(base, 120_000) + Math.floor(Math.random() * 1_000);
    this.relayTimer = setTimeout(async () => {
      this.relayTimer = null;
      await this.pollRelay();
      if (this.state.running) this.scheduleRelayPoll();
    }, delay);
  }

  /**
   * Doğrudan eş yokken şifreli zarfı buluta bırakır (store-and-forward).
   * Anahtarlar: bellek → yerel güven kaydı → bulut rehberi sırasıyla aranır.
   */
  private async relayViaCloud(
    kind: EnvelopeKind,
    to: string | "*",
    payload: unknown,
    priority: Priority,
  ): Promise<boolean> {
    if (to === "*" || TRANSIENT_KINDS.has(kind)) return false;
    if (!this.identity) return false;

    const devices = await this.resolveDevices(to);
    if (!devices.length) {
      void logRelayIssue("Karşı tarafın cihazı ağda hiç görünmedi; mesaj kuyrukta bekletiliyor.");
      return false;
    }

    try {
      const items: {
        pktId: string;
        to: string;
        from: string;
        envelope: string;
        priority: number;
      }[] = [];
      for (const device of devices) {
        const env = await createEnvelope({
          from: this.nodeId,
          to: device.nodeId,
          kind,
          payload,
          peerBoxPublic: device.boxPublic,
          senderSignPublic: this.identity.signPublic,
          priority,
          ttl: MAX_TTL,
        });
        items.push({
          pktId: env.h.pktId,
          to: device.nodeId,
          from: this.nodeId,
          envelope: encodeEnvelope(env),
          priority,
        });
      }
      const { pushRelayEnvelopes } = await import("@/lib/relay-cloud");
      const ok = await pushRelayEnvelopes(items);
      if (!ok) void logRelayIssue("Bulut rölesi mesajı kabul etmedi; yeniden denenecek.");
      else if (!this.state.online) this.emit({ online: true });
      return ok;
    } catch (error) {
      void logRelayIssue(
        `Şifreli zarf hazırlanamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`,
      );
      return false;
    }
  }

  /**
   * Hedefin ulaşılabilir cihazlarını çözer. Hedef ister cihaz düğümü
   * (mob-…) ister kişi kimliği (TBG-…) olsun aynı yanıt döner; kişinin
   * TÜM bağlı cihazlarına ayrı ayrı şifreli zarf gider (çoklu cihaz).
   *
   * Sonuç cihazda önbelleğe alınır: aynı hedef için saniyede onlarca dizin
   * sorgusu atılmaz, böylece bulut kotası boşa harcanmaz.
   */
  private async resolveDevices(to: string): Promise<{ nodeId: string; boxPublic: string }[]> {
    const now = Date.now();
    const cached = this.deviceCache.get(to);
    if (cached && cached.until > now) return cached.devices;

    const out = new Map<string, { nodeId: string; boxPublic: string }>();
    const local = this.peerKeys.get(to)?.bpk ?? (await getPeer(to))?.publicKey;
    if (local) out.set(to, { nodeId: to, boxPublic: local });
    let looked = false;
    try {
      const { lookupRelayDevices } = await import("@/lib/relay-cloud");
      for (const d of await lookupRelayDevices(to)) {
        if (d.nodeId === this.nodeId) continue;
        out.set(d.nodeId, { nodeId: d.nodeId, boxPublic: d.boxPublic });
        looked = true;
      }
    } catch {
      /* dizin okunamadı: yerel anahtarla devam */
    }
    const devices = Array.from(out.values());
    // Başarılı çözümleme uzun, boş sonuç kısa süre saklanır (kişi az sonra
    // ağa bağlanabilir).
    this.deviceCache.set(to, {
      devices,
      until: now + (looked && devices.length ? DEVICE_CACHE_MS : DEVICE_CACHE_MISS_MS),
    });
    if (this.deviceCache.size > 200) {
      for (const [key, value] of this.deviceCache) {
        if (value.until <= now) this.deviceCache.delete(key);
      }
    }
    return devices;
  }

  /**
   * Çevrimiçi iki cihaz arasında, veri kanalı henüz kurulmamış olsa bile
   * şifreli zarfı gerçek zamanlı yayın kanalından taşır. Sunucu yalnız opak
   * zarfı görür; içerik alıcının cihazında açılır. Arama sinyalleri burada
   * saklanmaz, bu nedenle eski çağrıların sonradan çalması mümkün değildir.
   */
  private async sendRealtimeEnvelope(
    kind: EnvelopeKind,
    to: string | "*",
    payload: unknown,
    priority: Priority,
  ): Promise<boolean> {
    if (!this.channel || !this.cloudUp || to === "*" || !this.identity) {
      return false;
    }
    const online = new Set(Object.keys(this.channel.presenceState()));
    const devices = (await this.resolveDevices(to)).filter((d) => online.has(d.nodeId));
    if (!devices.length) return false;

    try {
      let sent = false;
      for (const device of devices) {
        const env = await createEnvelope({
          from: this.nodeId,
          to: device.nodeId,
          kind,
          payload,
          peerBoxPublic: device.boxPublic,
          senderSignPublic: this.identity.signPublic,
          priority,
          ttl: MAX_TTL,
        });
        const result = await this.channel.send({
          type: "broadcast",
          event: "mesh",
          payload: { envelope: encodeEnvelope(env) },
        });
        if (result === "ok") sent = true;
      }
      return sent;
    } catch (error) {
      void logRelayIssue(
        `Gerçek zamanlı kanal gönderemedi: ${error instanceof Error ? error.message : "bilinmeyen hata"}`,
      );
      return false;
    }
  }

  /**
   * Yerel keşif düşüşü: tarayıcı ham mDNS soketi açamaz; aynı origin
   * altındaki tüm sekme/PWA örneklerini BroadcastChannel birbirine bağlar.
   * Gerçek LAN keşfi için yerel ajan (install.sh) kullanılır.
   */
  private startLocalDiscovery() {
    if (this.localBus || typeof BroadcastChannel === "undefined") return;
    try {
      this.localBus = new BroadcastChannel(LOCAL_CHANNEL);
    } catch {
      this.localBus = null;
      return;
    }
    this.localBus.onmessage = (e) => void this.onLocalMessage(e.data);
    this.announceLocal();
    this.localTimer = setInterval(() => this.announceLocal(), LOCAL_ANNOUNCE_MS);
  }

  private announceLocal() {
    try {
      this.localBus?.postMessage({ kind: "announce", from: this.nodeId, at: Date.now() });
    } catch {
      /* kanal kapanmış olabilir */
    }
  }

  private async onLocalMessage(raw: unknown) {
    const msg = raw as {
      kind?: string;
      from?: string;
      to?: string;
      data?: Record<string, unknown>;
    };
    if (!msg?.from || msg.from === this.nodeId) return;

    if (msg.kind === "announce") {
      this.localSeen.set(msg.from, Date.now());
      if (!this.peers.has(msg.from) && this.nodeId < msg.from) await this.createOffer(msg.from);
      this.emit({});
      return;
    }

    if (msg.kind === "signal" && msg.to === this.nodeId && msg.data) {
      await this.onSignal({ from: msg.from, to: msg.to, data: msg.data });
    }
  }

  /**
   * Katman B — yerel ağ (Wi-Fi / hotspot) üzerinden bulutsuz sinyalleşme.
   * Bluetooth ve internet kapalıyken bile aynı modeme bağlı iki cihaz,
   * yerel ajan/geçit adaylarından ilk yanıt vereni kullanarak WebRTC
   * el sıkışmasını tamamlar. Ajan yoksa sessizce yok sayılır.
   */
  private startLanSignaling() {
    if (typeof WebSocket === "undefined") return;
    const announce = (ws: WebSocket) => {
      try {
        ws.send(JSON.stringify({ kind: "announce", from: this.nodeId, at: Date.now() }));
      } catch {
        /* kapanmış olabilir */
      }
    };
    const tryConnect = () => {
      if (this.lanSocket && this.lanSocket.readyState <= WebSocket.OPEN) return;
      // Tüm adaylar aynı anda denenir; ilk açılan kazanır, diğerleri kapanır.
      for (const url of lanSignalUrls()) {
        let ws: WebSocket;
        try {
          ws = new WebSocket(url);
        } catch {
          continue;
        }
        ws.onopen = () => {
          if (
            this.lanSocket &&
            this.lanSocket !== ws &&
            this.lanSocket.readyState === WebSocket.OPEN
          ) {
            try {
              ws.close();
            } catch {
              /* yoksay */
            }
            return;
          }
          this.lanSocket = ws;
          announce(ws);
          this.emit({});
        };
        ws.onmessage = (e) => void this.onLanMessage(String(e.data));
        ws.onclose = () => {
          if (this.lanSocket === ws) {
            this.lanSocket = null;
            this.emit({});
          }
        };
        ws.onerror = () => {
          try {
            ws.close();
          } catch {
            /* yoksay */
          }
        };
      }
    };
    tryConnect();
    this.lanTimer = setInterval(
      () => {
        tryConnect();
        // Bağlıyken düzenli varlık duyurusu: yeni katılan cihaz 3 sn içinde bulunur.
        if (this.lanSocket?.readyState === WebSocket.OPEN) announce(this.lanSocket);
      },
      Math.min(LAN_RETRY_MS, LAN_ANNOUNCE_MS),
    );
  }

  private async onLanMessage(raw: string) {
    let msg: { kind?: string; from?: string; to?: string; data?: Record<string, unknown> };
    try {
      msg = JSON.parse(raw) as typeof msg;
    } catch {
      return;
    }
    if (!msg?.from || msg.from === this.nodeId) return;
    if (msg.kind === "announce") {
      if (!this.peers.has(msg.from) && this.nodeId < msg.from) await this.createOffer(msg.from);
      this.emit({});
      return;
    }
    if (msg.kind === "signal" && msg.to === this.nodeId && msg.data) {
      await this.onSignal({ from: msg.from, to: msg.to, data: msg.data });
    }
  }

  private lanReady() {
    return this.lanSocket?.readyState === WebSocket.OPEN;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.retryTimer = null;
    if (this.relayTimer) clearInterval(this.relayTimer);
    this.relayTimer = null;
    if (this.gcTimer) clearInterval(this.gcTimer);
    this.gcTimer = null;

    if (this.localTimer) clearInterval(this.localTimer);
    this.localTimer = null;
    if (this.lanTimer) clearInterval(this.lanTimer);
    this.lanTimer = null;
    try {
      this.lanSocket?.close();
    } catch {
      /* zaten kapalı */
    }
    this.lanSocket = null;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    this.peers.forEach((p) => p.pc.close());
    this.peers.clear();
    this.peerSeen.clear();
    this.pendingPeerIce.clear();
    try {
      this.localBus?.close();
    } catch {
      /* zaten kapalı */
    }
    this.localBus = null;
    this.localSeen.clear();
    this.cloudUp = false;
    this.resolveCloudReady?.();
    this.resolveCloudReady = null;
    this.cloudReady = null;
    if (this.channel) void supabase.removeChannel(this.channel);
    this.channel = null;
    this.emit({ running: false, discovery: "none" });
  }

  private handleOnline = () => {
    this.emit({ online: true });
    void appendEvent("uplink", "İnternet geri geldi — kuyruk boşaltılıyor.");
    this.queueBackoff = 0;
    this.deviceCache.clear();
    void this.flushQueue();

    void this.heartbeat();
    void this.publishDirectory();
    void this.pollRelay();
  };

  private handleOffline = () => {
    this.emit({ online: false });
    void appendEvent("uplink", "İnternet koptu — yerel kuyruk devrede.");
  };

  private async dialNewPeers() {
    const presence = this.channel?.presenceState() ?? {};
    const ids = Object.keys(presence).filter((id) => id && id !== this.nodeId);
    for (const id of ids) {
      if (this.peers.has(id)) continue;
      if (this.nodeId > id) continue;
      await this.createOffer(id);
    }
    this.emit({});
  }

  private newPeer(remote: string) {
    const pc = new RTCPeerConnection(buildMeshIce());
    const entry: { pc: RTCPeerConnection; dc: RTCDataChannel | null } = { pc, dc: null };
    this.peers.set(remote, entry);

    pc.onicecandidate = (e) => {
      if (e.candidate) void this.signal(remote, { type: "ice", candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        this.peers.delete(remote);
        pc.close();
      }
      this.emit({});
    };
    pc.ondatachannel = (e) => this.bindChannel(remote, e.channel);
    return entry;
  }

  private bindChannel(remote: string, dc: RTCDataChannel) {
    const entry = this.peers.get(remote);
    if (entry) entry.dc = dc;
    dc.onopen = () => {
      this.sendHello(dc);
      this.emit({});
      void this.flushQueue();
    };
    dc.onclose = () => this.emit({});
    dc.onmessage = (e) => void this.onMeshMessage(String(e.data), remote);
  }

  /** Kimlik el sıkışması: genel anahtarlar takas edilir (gizli anahtar asla). */
  private sendHello(dc: RTCDataChannel) {
    if (!this.identity || dc.readyState !== "open") return;
    const hello: Hello = {
      t: "hello",
      nodeId: this.nodeId,
      spk: this.identity.signPublic,
      bpk: this.identity.boxPublic,
      pid: getPersonId() || this.nodeId,
    };
    try {
      dc.send(JSON.stringify(hello));
    } catch {
      /* kanal kapandı */
    }
  }

  /**
   * Ücretsiz katman kotası: eşzamanlı 5 aktif eşten sonrası reddedilir.
   * Mevcut bir eşle yeniden pazarlık her zaman serbesttir.
   */
  private peerSlotAllowed(remote: string) {
    if (this.peers.has(remote)) return true;
    return canAcceptPeer(this.peers.size);
  }

  private async createOffer(remote: string) {
    if (!this.peerSlotAllowed(remote)) return;
    const entry = this.newPeer(remote);
    const dc = entry.pc.createDataChannel("mesh", { ordered: true });
    this.bindChannel(remote, dc);
    const offer = await entry.pc.createOffer();
    await entry.pc.setLocalDescription(offer);
    await this.signal(remote, { type: "offer", sdp: offer.sdp });
  }

  /**
   * Sinyal gönderimi üç katmanlı yedeklidir: bulut → yerel yayın → eş rölesi.
   * TURN kullanılmaz; simetrik NAT'ta kamuya açık IP'li Tedbirge düğümleri
   * dağıtık röle görevi görür (Karar 4).
   */
  private async signal(to: string, data: Record<string, unknown>) {
    const payload = { from: this.nodeId, to, data };
    let delivered = false;

    if (this.cloudUp && this.state.online && this.channel) {
      try {
        await this.channel.send({ type: "broadcast", event: "signal", payload });
        delivered = true;
      } catch {
        this.cloudUp = false;
      }
    }

    if (!delivered && this.lanReady()) {
      try {
        this.lanSocket?.send(JSON.stringify({ kind: "signal", ...payload }));
        delivered = true;
      } catch {
        /* soket kapandı */
      }
    }

    if (!delivered && this.localBus) {
      try {
        this.localBus.postMessage({ kind: "signal", ...payload });
        delivered = true;
      } catch {
        /* kanal kapalı */
      }
    }

    if (!delivered && this.snapshotPeers().some((p) => p.direct)) {
      await this.send("signal", to, data, 1);
    }

    this.emit({});
  }

  private async onSignal(payload: unknown) {
    const p = payload as { from?: string; to?: string; data?: Record<string, unknown> };
    if (!p?.from || p.to !== this.nodeId || !p.data) return;
    const remote = p.from;
    const data = p.data as { type: string; sdp?: string; candidate?: RTCIceCandidateInit };

    try {
      if (data.type === "offer") {
        if (!this.peerSlotAllowed(remote)) return;
        const entry = this.peers.get(remote) ?? this.newPeer(remote);

        await entry.pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
        const queued = this.pendingPeerIce.get(remote) ?? [];
        this.pendingPeerIce.delete(remote);
        for (const candidate of queued) await entry.pc.addIceCandidate(candidate);
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        await this.signal(remote, { type: "answer", sdp: answer.sdp });
      } else if (data.type === "answer") {
        const entry = this.peers.get(remote);
        if (entry && !entry.pc.currentRemoteDescription) {
          await entry.pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
          const queued = this.pendingPeerIce.get(remote) ?? [];
          this.pendingPeerIce.delete(remote);
          for (const candidate of queued) await entry.pc.addIceCandidate(candidate);
        }
      } else if (data.type === "ice" && data.candidate) {
        const entry = this.peers.get(remote);
        if (!entry?.pc.remoteDescription) {
          this.pendingPeerIce.set(remote, [
            ...(this.pendingPeerIce.get(remote) ?? []),
            data.candidate,
          ]);
        } else {
          await entry.pc.addIceCandidate(data.candidate);
        }
      }
    } catch (error) {
      this.emit({ error: error instanceof Error ? error.message : "sinyalleşme hatası" });
    }
  }

  /* --------------------------- mesaj işleme --------------------------- */

  private async onMeshMessage(raw: string, from: string) {
    // 1) Kimlik el sıkışması (şifrelenmez: yalnızca genel anahtar taşır).
    try {
      const maybe = JSON.parse(raw) as Partial<Hello>;
      if (maybe?.t === "hello" && maybe.nodeId && maybe.spk && maybe.bpk) {
        const { fingerprintOfKey } = await import("@/lib/crypto/identity");
        const fingerprint = fingerprintOfKey(maybe.spk);
        // Cihaz → kişi bağı: aynı kişinin farklı cihazları rehberde tek kart olur.
        if (maybe.pid && maybe.pid !== maybe.nodeId) {
          try {
            const { linkNodeToPerson } = await import("@/lib/chat/name-resolver");
            linkNodeToPerson(maybe.nodeId, maybe.pid);
          } catch {
            /* eşleme yazılamadı: teslim etkilenmez */
          }
        }
        // TOFU: anahtar sabitlenir; değiştiyse "changed" uyarısı üretilir.
        const trust = await observePeerKey({
          peerId: maybe.nodeId,
          signPublic: maybe.spk,
          boxPublic: maybe.bpk,
        });
        if (trust === "changed") {
          await appendEvent(
            "security",
            `Eş parmak izi DEĞİŞTİ (${maybe.nodeId}). Yeniden doğrulanana kadar güvenilmez.`,
          );
        }
        this.peerKeys.set(maybe.nodeId, {
          spk: maybe.spk,
          bpk: maybe.bpk,
          fingerprint,
          verified: trust === "manual",
          trust,
        });
        this.peerSeen.set(maybe.nodeId, Date.now());
        observeNode(this.nodeId, { nodeId: maybe.nodeId, via: maybe.nodeId, hops: 1 });
        this.emit({});
        void this.flushQueue();
        return;
      }
    } catch {
      /* zarf olabilir */
    }

    // 2) MeshEnvelope v2 — imza doğrulanmadan hiçbir işlem yapılmaz.
    const env = decodeEnvelope(raw);
    if (!env) return;
    if (!verifyEnvelope(env)) {
      this.emit({ droppedUnsigned: this.state.droppedUnsigned + 1 });
      recordDrop();
      void appendEvent("security", `İmzası doğrulanamayan paket düşürüldü (${from}).`);
      return;
    }
    if (await alreadySeen(env.h.pktId)) return;
    await markSeen(env.h.pktId);
    witnessClock(env.h.lamport);

    recordRx(env.h.hops ?? 0);
    // Canlılık ve dizin gözlemi: paketi taşıyan komşu üzerinden kaynak düğüm
    // kaç sıçrama uzakta olduğuyla birlikte DHT dizinine yazılır.
    if (this.peers.has(from)) this.peerSeen.set(from, Date.now());
    observeNode(this.nodeId, {
      nodeId: env.h.from,
      via: this.peers.has(from) ? from : env.h.from,
      hops: Math.max(1, (env.h.hops ?? 0) + 1),
    });
    if (env.h.to === this.nodeId || env.h.to === "*") await this.handleForMe(env);

    // 3) Röle: gövde OPAKTIR, yalnız başlık güncellenir.
    // Kullanıcı röleyi kapattıysa hiçbir yabancı paket taşınmaz.
    if (env.h.to !== this.nodeId && isRelayEnabled()) {
      const fwd = forwardEnvelope(env);
      if (fwd) {
        const raw = encodeEnvelope(fwd);
        // Yönlendirilmiş iletim: hedef biliniyorsa paket YALNIZ bir sonraki
        // sıçramaya verilir. Yayın (*) yalnız keşif/acil paketleri içindir;
        // adresli paketin tüm ağa saçılması veri sızıntısıdır.
        const hop = env.h.to === "*" ? null : liveNextHop(this.nodeId, env.h.to);
        const direct = hop ? this.peers.get(hop) : null;
        if (direct?.dc?.readyState === "open") {
          try {
            direct.dc.send(raw);
          } catch {
            this.broadcastRaw(raw, from);
          }
        } else this.broadcastRaw(raw, from);
        recordRelay();
        this.emit({ lastRelayAt: new Date().toISOString(), notice: null });
      } else {
        // TTL tükendi: paket sessizce kaybolmaz, arayüzde durum kodu üretir.
        this.emit({ notice: TTL_EXHAUSTED_NOTICE });
        void appendEvent("mesh", TTL_EXHAUSTED_NOTICE);
      }
    }
  }

  private async handleForMe(env: MeshEnvelopeV2) {
    let body: unknown;
    try {
      body = await openEnvelope(this.nodeId, env);
    } catch {
      // Bize şifrelenmemiş yayın paketi: içerik okunamaz, yalnız röle edilir.
      return;
    }

    if (env.h.kind === "ping") {
      await this.send("pong", env.h.from, body, 1);
    } else if (env.h.kind === "pong") {
      const sentAt = Number((body as { at?: number })?.at ?? 0);
      if (sentAt) {
        const rtt = Date.now() - sentAt;
        recordRtt(rtt);
        this.emit({ rttMs: rtt });
      }
    } else if (env.h.kind === "signal") {
      await this.onSignal({
        from: env.h.from,
        to: this.nodeId,
        data: body as Record<string, unknown>,
      });
    } else if (APP_KINDS.includes(env.h.kind)) {
      // Çoklu hat parçası: yük tamamlanmadan uygulamaya verilmez.
      if (isChunkFrame(body)) {
        const done = ingestChunk(body);
        if (!done) return;
        appHandler?.(env.h.kind, env.h.from, done.payload);
        return;
      }
      appHandler?.(env.h.kind, env.h.from, body);
      if (env.h.kind === "telemetry") return;
    } else if (env.h.kind === "telemetry" && this.state.online) {
      await this.postTelemetry(body as Record<string, unknown>);
      this.emit({ lastRelayAt: new Date().toISOString() });
    }
  }

  /* ---------------------------- gönderim ---------------------------- */

  private openPeers(exclude?: string) {
    return Array.from(this.peers.entries()).filter(
      ([id, p]) => id !== exclude && p.dc?.readyState === "open",
    );
  }

  /**
   * IP taşıyıcısı (WebRTC) ile yayın. Hiç eş yoksa PHY veri düzlemi
   * (LoRa/HaLow köprüsü) devreye girer — gövde yine şifrelidir.
   */
  private broadcastRaw(raw: string, exclude?: string, priority: Priority = 2) {
    const open = this.openPeers(exclude);
    open.forEach(([, p]) => {
      try {
        p.dc?.send(raw);
      } catch {
        /* kanal kapandı */
      }
    });
    if (open.length) return true;
    return this.carrierSend ? this.carrierSend(raw, priority) : false;
  }

  /** PHY veri düzlemi köprüsünü bağlar (carrier-bridge tarafından ayarlanır). */
  setCarrierTransport(fn: ((raw: string, priority: Priority) => boolean) | null) {
    this.carrierSend = fn;
  }

  /** Taşıyıcı köprüsünden gelen ham zarfı mesh katmanına verir. */
  ingestCarrierEnvelope(raw: string, carrier: string) {
    void this.onMeshMessage(raw, `phy:${carrier}`);
  }

  /**
   * Uçtan uca şifreli gönderim. Hedef başına ayrı zarf üretilir:
   * yalnızca alıcı gövdeyi açabilir. Eş yoksa niyet kuyruğa yazılır.
   */
  async send(
    kind: EnvelopeKind,
    to: string | "*",
    payload: unknown,
    priority?: Priority,
    allowEnqueue = true,
  ) {
    const prio = priority ?? defaultPriority(kind);
    // Egress kilidi: hedef yalnızca overlay düğüm kimliği olabilir (5651 kapalı devre).
    assertNoEgress(to);
    if (!this.identity) this.identity = await ensureIdentity(this.nodeId);

    // Soğuk açılıştaki ilk paket, gerçek zamanlı kanalın abone olmasından birkaç
    // milisaniye önce gelirse kaybolmasın. Yerel/çevrimdışı yolları engellememek
    // için bekleme kesin olarak kısa ve sınırlıdır.
    if (this.state.online && this.cloudReady && !this.cloudUp) {
      await Promise.race([
        this.cloudReady,
        new Promise<void>((resolve) => window.setTimeout(resolve, 2_500)),
      ]);
    }

    const targets = this.openPeers()
      .map(([id]) => id)
      .filter((id) => (to === "*" ? true : id === to))
      .filter((id) => this.peerKeys.has(id));

    if (!targets.length) {
      // İnternet varken doğrudan WebRTC veri kanalı oluşmasını beklemeyiz:
      // mesaj ve arama sinyali şifreli gerçek zamanlı kanaldan anında gider.
      if (await this.sendRealtimeEnvelope(kind, to, payload, prio)) {
        recordTx(true);
        this.emit({});
        return true;
      }
      // IP yok: bilinen eşler için PHY veri düzlemini (LoRa/HaLow) dene.
      if (this.carrierSend) {
        const known = Array.from(this.peerKeys.entries()).filter(([id]) => to === "*" || id === to);
        let pushed = false;
        for (const [, keys] of known) {
          const env = await createEnvelope({
            from: this.nodeId,
            to,
            kind,
            payload,
            peerBoxPublic: keys.bpk,
            senderSignPublic: this.identity.signPublic,
            priority: prio,
            ttl: MAX_TTL,
          });
          if (this.carrierSend(encodeEnvelope(env), prio)) pushed = true;
        }
        if (pushed) {
          recordTx(true);
          this.emit({});
          return true;
        }
      }
      recordTx(false);
      // Kontrol paketleri gerçek zamanlıdır. Saklanmaları gecikme üretir,
      // eski çağrıları yeniden çaldırır ve ping/pong çoğalma döngüsü kurar.
      if (TRANSIENT_KINDS.has(kind)) return false;
      // Bulut yedek röle: alıcı kapalı olsa bile mesaj teslim edilmek üzere saklanır.
      if (await this.relayViaCloud(kind, to, payload, prio)) {
        recordTx(true);
        this.emit({});
        return true;
      }
      // Arama sinyali çevrimdışı mesaj gibi yerel kalıcı kuyruğa yazılmaz;
      // yalnız kısa ömürlü gerçek zamanlı/yedek röle yollarında denenir.
      if (NEVER_ENQUEUE_KINDS.has(kind)) return false;
      // flushQueue mevcut bir niyeti yeniden denerken ikinci bir kuyruk kaydı
      // üretmemelidir. Aksi halde her başarısız tur kuyruğu katlayarak büyütür.
      if (!allowEnqueue) return false;
      await this.enqueue({ t: "intent", kind, to, payload, priority: prio });
      this.emit({ notice: TTL_EXHAUSTED_NOTICE });
      return false;
    }

    // Büyük yük (fotoğraf/ses/dosya/geçmiş) tek hattı tıkamaz: parçalara
    // bölünür ve açık hatlara paralel dağıtılır.
    const chunks = chunkPayload(payload);
    if (chunks.length) {
      const ok = await this.sendChunks(kind, to, chunks, prio, targets);
      this.emit({});
      return ok;
    }

    for (const target of targets) {
      const keys = this.peerKeys.get(target)!;
      const env = await createEnvelope({
        from: this.nodeId,
        to,
        kind,
        payload,
        peerBoxPublic: keys.bpk,
        senderSignPublic: this.identity.signPublic,
        priority: prio,
        ttl: MAX_TTL,
      });
      const raw = encodeEnvelope(env);
      const peer = this.peers.get(target);
      try {
        peer?.dc?.send(raw);
        recordTx(true);
      } catch {
        recordTx(false);
        await this.enqueue({ t: "fwd", env });
      }
    }
    this.emit({});
    return true;
  }

  /**
   * Parçaları hatlara dağıtıp paralel gönderir. Her hedef için ayrı zarf
   * üretilir (uçtan uca şifreleme korunur); hatlar eşzamanlı akar.
   */
  private async sendChunks(
    kind: EnvelopeKind,
    to: string | "*",
    chunks: ReturnType<typeof chunkPayload>,
    prio: Priority,
    targets: string[],
  ): Promise<boolean> {
    if (!this.identity) return false;
    const lanes = laneSchedule(chunks, transitConfig().lanes);
    let ok = true;
    await Promise.all(
      lanes.map(async (lane) => {
        for (const chunk of lane) {
          for (const target of targets) {
            const keys = this.peerKeys.get(target);
            if (!keys || !this.identity) continue;
            const env = await createEnvelope({
              from: this.nodeId,
              to,
              kind,
              payload: chunk,
              peerBoxPublic: keys.bpk,
              senderSignPublic: this.identity.signPublic,
              priority: prio,
              ttl: MAX_TTL,
            });
            const raw = encodeEnvelope(env);
            try {
              this.peers.get(target)?.dc?.send(raw);
              recordTx(true);
            } catch {
              recordTx(false);
              ok = false;
              await this.enqueue({ t: "fwd", env });
            }
          }
        }
      }),
    );
    return ok;
  }

  /**
   * Hayalet düğüm temizliği: yapılandırılan süre boyunca hiç paket
   * göndermeyen eşin bağlantısı kapatılır, anahtarları ve DHT kaydı silinir.
   * Böylece rota motoru ölü hatlara yönlendirme yapmaz.
   */
  private sweepStalePeers() {
    const timeout = transitConfig().peerTimeoutMs;
    const now = Date.now();
    let changed = false;
    for (const [id, entry] of this.peers) {
      const seen = this.peerSeen.get(id) ?? 0;
      const dead =
        ["failed", "closed", "disconnected"].includes(entry.pc.connectionState) ||
        (seen > 0 && now - seen > timeout);
      if (!dead) continue;
      try {
        entry.pc.close();
      } catch {
        /* zaten kapalı */
      }
      this.peers.delete(id);
      this.peerSeen.delete(id);
      this.peerKeys.delete(id);
      forgetNode(this.nodeId, id);
      changed = true;
    }
    // Açık hatlara hafif canlılık yoklaması (RTT ölçümü ve GC damgası).
    if (this.openPeers().length) void this.send("ping", "*", { at: Date.now() }, 1);
    if (changed) this.emit({});
  }

  private async enqueue(item: QueuedItem) {
    const pktId =
      item.t === "fwd"
        ? item.env.h.pktId
        : `intent-${randomId("q").slice(2)}-${Date.now().toString(36)}`;
    const priority = item.t === "fwd" ? item.env.h.priority : item.priority;
    await putPacket({ pktId, priority, ts: Date.now(), attempts: 0, env: item });
    await pruneOutbox();
    await this.refreshQueueCount();
  }

  /** IndexedDB'deki kalıcı güven kaydını okuyup eş rozetini tazeler. */
  async refreshPeerTrust(peerId: string) {
    const rec = await getPeer(peerId);
    const status = trustStatusOf(rec);
    const keys = this.peerKeys.get(peerId);
    if (keys) this.peerKeys.set(peerId, { ...keys, trust: status, verified: status === "manual" });
    this.emit({});
    return status;
  }

  /** Anahtar değişimi tamamlanmış (mesaj gönderilebilir) eşlerin kimlikleri. */
  knownPeerIds(): string[] {
    return Array.from(this.peerKeys.keys());
  }

  /** Kullanıcı testi: tüm eşlere ping atar, dönen pong ile RTT ölçülür. */
  pingPeers() {
    return this.send("ping", "*", { at: Date.now() }, 1);
  }

  /** Acil durum yayını — öncelik 0, kuyrukta asla budanmaz. */
  sendAlert(text: string) {
    return this.send("alert", "*", { text, at: Date.now() }, 0);
  }

  /**
   * Kuyruk yeniden denemesi sabit aralıklı değildir: teslim edilecek paket
   * yoksa ya da bulut kotası soğuma penceresindeyse tur atlanır ve bekleme
   * üstel olarak büyür (12 sn → 2 dk). Böylece boşa istek üretilmez.
   */
  private scheduleQueueFlush() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const delay = Math.min(12_000 * 2 ** this.queueBackoff, 120_000);
    this.retryTimer = setTimeout(async () => {
      this.retryTimer = null;
      await this.flushQueue();
      if (this.state.running) this.scheduleQueueFlush();
    }, delay);
  }

  private async flushQueue() {
    if (this.flushBusy) return;
    const { relayCooldownRemainingMs } = await import("@/lib/relay-cloud");
    if (relayCooldownRemainingMs() > 0) {
      this.queueBackoff = Math.min(this.queueBackoff + 1, 4);
      return;
    }
    this.flushBusy = true;
    let delivered = 0;
    try {
      const rows = await getPackets();
      if (!rows.length) {
        this.queueBackoff = Math.min(this.queueBackoff + 1, 4);
        return;
      }

      const durable: typeof rows = [];
      const uniqueIntents = new Set<string>();
      for (const row of rows) {
        const item = row.env as QueuedItem;
        if (!item || typeof item !== "object") {
          await deletePacket(row.pktId);
          continue;
        }
        // Önceki sürümlerden kalan bütün anlık kontrol paketlerini tek seferde
        // temizle. Bunlar tekrar gönderilmez ve yeni kuyruk öğesi üretemez.
        const queuedKind = item.t === "intent" ? item.kind : item.env.h.kind;
        if (NEVER_ENQUEUE_KINDS.has(queuedKind)) {
          await deletePacket(row.pktId);
          continue;
        }
        if (item.t === "intent") {
          const payloadId = (item.payload as { id?: unknown } | null)?.id;
          if (typeof payloadId === "string") {
            const key = `${item.kind}:${item.to}:${payloadId}`;
            if (uniqueIntents.has(key)) {
              await deletePacket(row.pktId);
              continue;
            }
            uniqueIntents.add(key);
          }
        }
        durable.push(row);
      }

      // Tek turda sınırlı sayıda kalıcı öğe gönderilir; büyük eski kuyruklar
      // API'yi tekrar 429'a sürüklemeden kontrollü biçimde boşalır.
      for (const row of durable.slice(0, 25)) {
        if (relayCooldownRemainingMs() > 0) break;
        const item = row.env as QueuedItem;
        if (item.t === "fwd") {
          if (this.broadcastRaw(encodeEnvelope(item.env))) await deletePacket(row.pktId);
          continue;
        }

        if (item.kind === "telemetry" && this.state.online) {
          const ok = await this.postTelemetry(item.payload as Record<string, unknown>);
          if (ok) await deletePacket(row.pktId);
          continue;
        }
        const sent = await this.send(item.kind, item.to, item.payload, item.priority, false);
        if (sent) {
          delivered += 1;
          await deletePacket(row.pktId);
          const messageId = (item.payload as { id?: unknown } | null)?.id;
          if (typeof messageId === "string") {
            window.dispatchEvent(
              new CustomEvent("tedbirge:outbox-sent", { detail: { messageId } }),
            );
          }
        }
      }
    } finally {
      this.flushBusy = false;
      // İlerleme varsa hızlı tur, yoksa kademeli bekleme.
      this.queueBackoff = delivered > 0 ? 0 : Math.min(this.queueBackoff + 1, 4);
      await this.refreshQueueCount();
    }
  }

  private async postTelemetry(body: Record<string, unknown>) {
    if (this.demoMode) return false;
    try {
      const res = await fetch("/api/public/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tedbirge-License": this.licenseKey },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Düğüm heartbeat'i: panelde bu cihaz gerçek düğüm olarak çevrimiçi görünür. */
  async heartbeat() {
    const directPeers = this.snapshotPeers().filter((p) => p.direct).length;
    const body = {
      node_id: this.nodeId,
      label: "Tarayıcı düğümü (mobil/masaüstü)",
      carrier: detectCarrier(),
      firmware: "browser-node-2.0",
      hops: directPeers ? 1 : 0,
      packet_loss_pct: this.state.online ? 0 : 100,
      rtt_ms: this.state.rttMs ?? 0,
      note: `tarayici-dugumu · dogrudan-es:${directPeers}`,
      ...(this.state.online ? {} : { error_code: "uplink_offline" }),
    };

    if (this.demoMode) {
      this.emit({ lastHeartbeatAt: new Date().toISOString(), error: null });
      return;
    }

    if (!this.state.online) {
      // Bulut yok: eşler üzerinden röle dene, olmazsa kalıcı kuyruğa yaz.
      const relayed = await this.send("telemetry", "*", body, 3);
      this.emit({
        lastHeartbeatAt: relayed ? new Date().toISOString() : this.state.lastHeartbeatAt,
      });
      return;
    }

    const ok = await this.postTelemetry(body);
    this.emit({
      lastHeartbeatAt: ok ? new Date().toISOString() : this.state.lastHeartbeatAt,
      error: ok ? null : "Heartbeat gönderilemedi (lisans anahtarını kontrol edin).",
    });
    if (ok) void this.flushQueue();
  }
}
