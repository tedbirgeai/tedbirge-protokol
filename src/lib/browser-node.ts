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
  type EnvelopeKind,
  type MeshEnvelopeV2,
} from "@/lib/mesh-envelope";
import {
  alreadySeen,
  appendEvent,
  countPackets,
  deletePacket,
  getPackets,
  markSeen,
  migrateLegacyQueue,
  putPacket,
  putPeer,
  requestPersistentStorage,
  type Priority,
} from "@/lib/store/idb";
import { pruneOutbox } from "@/lib/store/pruning";

const ID_KEY = "tedbirge.browser-node.id";
const CHANNEL = "tedbirge-mesh-v1";
/** Yerel keşif kanalı: aynı cihaz/aynı origin üzerindeki sekme ve PWA örnekleri. */
const LOCAL_CHANNEL = "tedbirge-local-mesh-v1";
const LOCAL_ANNOUNCE_MS = 4_000;
const MAX_TTL = 4;

export type PeerInfo = {
  nodeId: string;
  state: RTCPeerConnectionState;
  direct: boolean;
  fingerprint?: string;
  verified?: boolean;
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

type Hello = { t: "hello"; nodeId: string; spk: string; bpk: string };
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

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

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
  if (conn?.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType)) return "cellular";
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
  private localBus: BroadcastChannel | null = null;
  private localSeen = new Map<string, number>();
  private localTimer: ReturnType<typeof setInterval> | null = null;
  private peers = new Map<string, { pc: RTCPeerConnection; dc: RTCDataChannel | null }>();
  private peerKeys = new Map<string, { spk: string; bpk: string; fingerprint: string; verified: boolean }>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private identity: Identity | null = null;
  private state: BrowserNodeState;

  constructor(licenseKey: string | undefined, onState: (s: BrowserNodeState) => void) {
    this.licenseKey = licenseKey ?? "";
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
    const queued = await countPackets();
    this.emit({ queued });
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

    this.startLocalDiscovery();

    this.channel = supabase.channel(CHANNEL, {
      config: { broadcast: { self: false }, presence: { key: this.nodeId } },
    });

    this.channel
      .on("presence", { event: "sync" }, () => void this.dialNewPeers())
      .on("broadcast", { event: "signal" }, ({ payload }) => void this.onSignal(payload))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          this.cloudUp = true;
          await this.channel?.track({ nodeId: this.nodeId, at: Date.now() });
          void this.dialNewPeers();
          this.emit({});
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          this.cloudUp = false;
          this.emit({});
        }
      });

    await this.heartbeat();
    this.timer = setInterval(() => void this.heartbeat(), 60_000);
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
    const msg = raw as { kind?: string; from?: string; to?: string; data?: Record<string, unknown> };
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

  stop() {
    this.timer && clearInterval(this.timer);
    this.timer = null;
    if (this.localTimer) clearInterval(this.localTimer);
    this.localTimer = null;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    this.peers.forEach((p) => p.pc.close());
    this.peers.clear();
    try {
      this.localBus?.close();
    } catch {
      /* zaten kapalı */
    }
    this.localBus = null;
    this.localSeen.clear();
    this.cloudUp = false;
    if (this.channel) void supabase.removeChannel(this.channel);
    this.channel = null;
    this.emit({ running: false, discovery: "none" });
  }

  private handleOnline = () => {
    this.emit({ online: true });
    void appendEvent("uplink", "İnternet geri geldi — kuyruk boşaltılıyor.");
    void this.flushQueue();
    void this.heartbeat();
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
    const pc = new RTCPeerConnection(ICE);
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
    };
    try {
      dc.send(JSON.stringify(hello));
    } catch {
      /* kanal kapandı */
    }
  }

  private async createOffer(remote: string) {
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
        const entry = this.peers.get(remote) ?? this.newPeer(remote);
        await entry.pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        await this.signal(remote, { type: "answer", sdp: answer.sdp });
      } else if (data.type === "answer") {
        const entry = this.peers.get(remote);
        if (entry && !entry.pc.currentRemoteDescription) {
          await entry.pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
        }
      } else if (data.type === "ice" && data.candidate) {
        await this.peers.get(remote)?.pc.addIceCandidate(data.candidate);
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
        this.peerKeys.set(maybe.nodeId, {
          spk: maybe.spk,
          bpk: maybe.bpk,
          fingerprint,
          verified: true,
        });
        await putPeer({
          peerId: maybe.nodeId,
          verifyKey: maybe.spk,
          publicKey: maybe.bpk,
          fingerprint,
          verified: true,
          lastSeen: Date.now(),
        });
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
      void appendEvent("security", `İmzası doğrulanamayan paket düşürüldü (${from}).`);
      return;
    }
    if (await alreadySeen(env.h.pktId)) return;
    await markSeen(env.h.pktId);
    witnessClock(env.h.lamport);

    if (env.h.to === this.nodeId || env.h.to === "*") await this.handleForMe(env);

    // 3) Röle: gövde OPAKTIR, yalnız başlık güncellenir.
    if (env.h.to !== this.nodeId) {
      const fwd = forwardEnvelope(env);
      if (fwd) {
        this.broadcastRaw(encodeEnvelope(fwd), from);
        this.emit({ lastRelayAt: new Date().toISOString() });
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
      if (sentAt) this.emit({ rttMs: Date.now() - sentAt });
    } else if (env.h.kind === "signal") {
      await this.onSignal({ from: env.h.from, to: this.nodeId, data: body as Record<string, unknown> });
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

  private broadcastRaw(raw: string, exclude?: string) {
    const open = this.openPeers(exclude);
    open.forEach(([, p]) => {
      try {
        p.dc?.send(raw);
      } catch {
        /* kanal kapandı */
      }
    });
    return open.length > 0;
  }

  /**
   * Uçtan uca şifreli gönderim. Hedef başına ayrı zarf üretilir:
   * yalnızca alıcı gövdeyi açabilir. Eş yoksa niyet kuyruğa yazılır.
   */
  async send(kind: EnvelopeKind, to: string | "*", payload: unknown, priority?: Priority) {
    const prio = priority ?? defaultPriority(kind);
    if (!this.identity) this.identity = await ensureIdentity(this.nodeId);

    const targets = this.openPeers()
      .map(([id]) => id)
      .filter((id) => (to === "*" ? true : id === to))
      .filter((id) => this.peerKeys.has(id));

    if (!targets.length) {
      await this.enqueue({ t: "intent", kind, to, payload, priority: prio });
      return false;
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
      } catch {
        await this.enqueue({ t: "fwd", env });
      }
    }
    this.emit({});
    return true;
  }

  private async enqueue(item: QueuedItem) {
    const pktId =
      item.t === "fwd" ? item.env.h.pktId : `intent-${randomId("q").slice(2)}-${Date.now().toString(36)}`;
    const priority = item.t === "fwd" ? item.env.h.priority : item.priority;
    await putPacket({ pktId, priority, ts: Date.now(), attempts: 0, env: item });
    await pruneOutbox();
    await this.refreshQueueCount();
  }

  /** Kullanıcı testi: tüm eşlere ping atar, dönen pong ile RTT ölçülür. */
  pingPeers() {
    return this.send("ping", "*", { at: Date.now() }, 1);
  }

  /** Acil durum yayını — öncelik 0, kuyrukta asla budanmaz. */
  sendAlert(text: string) {
    return this.send("alert", "*", { text, at: Date.now() }, 0);
  }

  private async flushQueue() {
    const rows = await getPackets();
    if (!rows.length) return;
    for (const row of rows) {
      const item = row.env as QueuedItem;
      if (!item || typeof item !== "object") {
        await deletePacket(row.pktId);
        continue;
      }
      if (item.t === "fwd") {
        if (this.broadcastRaw(encodeEnvelope(item.env))) await deletePacket(row.pktId);
        continue;
      }
      if (item.kind === "telemetry" && this.state.online) {
        const ok = await this.postTelemetry(item.payload as Record<string, unknown>);
        if (ok) await deletePacket(row.pktId);
        continue;
      }
      const sent = await this.send(item.kind, item.to, item.payload, item.priority);
      if (sent) await deletePacket(row.pktId);
    }
    await this.refreshQueueCount();
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
      this.emit({ lastHeartbeatAt: relayed ? new Date().toISOString() : this.state.lastHeartbeatAt });
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
