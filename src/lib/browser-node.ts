/**
 * Tarayıcı Düğümü (Browser Node)
 * ------------------------------------------------------------------
 * Cep telefonu / tablet / bilgisayarı fiziksel donanım kurmadan
 * gerçek bir Tedbirge düğümüne dönüştürür.
 *
 * Neyi gerçekten yapar:
 *  - Kalıcı düğüm kimliği üretir (localStorage) ve panele heartbeat gönderir.
 *  - Supabase Realtime üzerinden eşleri keşfeder, WebRTC DataChannel ile
 *    doğrudan cihaz-cihaz (P2P) bağlantı kurar. Aynı Wi-Fi/LAN'da bu trafik
 *    yerel ağda kalır, bulut üzerinden geçmez.
 *  - Çoklu atlama (TTL'li) mesaj rölesi: bir eş bulutu göremiyorsa, mesajı
 *    gören bir eş üzerinden iletir.
 *  - Bağlantı koptuğunda mesajları kalıcı kuyruğa yazar, dönünce sırayla iletir.
 *
 * Neyi yapamaz (tarayıcı sandbox sınırı):
 *  - LoRa/HaLow/TVWS/WiGig/FSO gibi lisanslı/özel radyoları süremez.
 *  - iOS'ta Wi-Fi ve hücresel tamamen kapalıyken hiçbir web uygulaması
 *    radyo açamaz; o durumda düğüm kuyruk moduna geçer.
 */

import { supabase } from "@/integrations/supabase/client";

const ID_KEY = "tedbirge.browser-node.id";
const QUEUE_KEY = "tedbirge.browser-node.queue";
const CHANNEL = "tedbirge-mesh-v1";
const MAX_TTL = 4;
const MAX_QUEUE = 200;

export type PeerInfo = { nodeId: string; state: RTCPeerConnectionState; direct: boolean };

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
};

export type MeshEnvelope = {
  id: string;
  from: string;
  to: string | "*";
  ttl: number;
  kind: "ping" | "pong" | "telemetry" | "text";
  body: unknown;
  at: number;
};

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

function readQueue(): MeshEnvelope[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as MeshEnvelope[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: MeshEnvelope[]) {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
}

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

/**
 * Cihazın gerçekte kullandığı taşıyıcıyı raporlar (uydurma değer yok).
 * Network Information API yoksa "wifi" varsayılır; panelde taşıyıcı yalnızca
 * gerçek telemetri geldiğinde aktif görünür.
 */
export function detectCarrier(): "wifi" | "cellular" | "ethernet" {
  const conn = (navigator as unknown as { connection?: { type?: string; effectiveType?: string } })
    .connection;
  const type = conn?.type;
  if (type === "cellular") return "cellular";
  if (type === "ethernet") return "ethernet";
  if (type === "wifi") return "wifi";
  // iOS/Safari: type yok. effectiveType 2g/3g genelde hücresel demektir.
  if (conn?.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType)) return "cellular";
  return "wifi";
}


export class BrowserNode {
  readonly nodeId = getBrowserNodeId();
  private licenseKey: string;
  /** Lisans yoksa düğüm "demo modu"nda çalışır: P2P + kuyruk var, bulut telemetrisi yok. */
  private get demoMode() {
    return !this.licenseKey;
  }
  private onState: (s: BrowserNodeState) => void;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private peers = new Map<string, { pc: RTCPeerConnection; dc: RTCDataChannel | null }>();
  private seen = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: BrowserNodeState;

  constructor(licenseKey: string | undefined, onState: (s: BrowserNodeState) => void) {
    this.licenseKey = licenseKey ?? "";
    this.onState = onState;
    this.state = {
      running: false,
      nodeId: this.nodeId,
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      peers: [],
      queued: readQueue().length,
      lastHeartbeatAt: null,
      lastRelayAt: null,
      rttMs: null,
      error: null,
    };
  }

  private emit(patch: Partial<BrowserNodeState>) {
    this.state = { ...this.state, ...patch, peers: this.snapshotPeers(), queued: readQueue().length };
    this.onState(this.state);
  }

  private snapshotPeers(): PeerInfo[] {
    return Array.from(this.peers.entries()).map(([nodeId, p]) => ({
      nodeId,
      state: p.pc.connectionState,
      direct: p.dc?.readyState === "open",
    }));
  }

  async start() {
    if (this.state.running) return;
    this.emit({ running: true, error: null });

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);

    this.channel = supabase.channel(CHANNEL, {
      config: { broadcast: { self: false }, presence: { key: this.nodeId } },
    });

    this.channel
      .on("presence", { event: "sync" }, () => void this.dialNewPeers())
      .on("broadcast", { event: "signal" }, ({ payload }) => void this.onSignal(payload))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await this.channel?.track({ nodeId: this.nodeId, at: Date.now() });
          void this.dialNewPeers();
        }
      });

    await this.heartbeat();
    this.timer = setInterval(() => void this.heartbeat(), 60_000);
  }

  stop() {
    this.timer && clearInterval(this.timer);
    this.timer = null;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    this.peers.forEach((p) => p.pc.close());
    this.peers.clear();
    if (this.channel) void supabase.removeChannel(this.channel);
    this.channel = null;
    this.emit({ running: false });
  }

  private handleOnline = () => {
    this.emit({ online: true });
    void this.flushQueue();
    void this.heartbeat();
  };

  private handleOffline = () => this.emit({ online: false });

  /** Presence listesindeki, henüz bağlanmadığımız eşlere teklif gönderir. */
  private async dialNewPeers() {
    const presence = this.channel?.presenceState() ?? {};
    const ids = Object.keys(presence).filter((id) => id && id !== this.nodeId);
    for (const id of ids) {
      if (this.peers.has(id)) continue;
      // Çift teklif olmaması için yalnızca kimliği "küçük" olan taraf arar.
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
      this.emit({});
      void this.flushQueue();
    };
    dc.onclose = () => this.emit({});
    dc.onmessage = (e) => this.onMeshMessage(String(e.data));
  }

  private async createOffer(remote: string) {
    const entry = this.newPeer(remote);
    const dc = entry.pc.createDataChannel("mesh", { ordered: true });
    this.bindChannel(remote, dc);
    const offer = await entry.pc.createOffer();
    await entry.pc.setLocalDescription(offer);
    await this.signal(remote, { type: "offer", sdp: offer.sdp });
  }

  private async signal(to: string, data: Record<string, unknown>) {
    await this.channel?.send({
      type: "broadcast",
      event: "signal",
      payload: { from: this.nodeId, to, data },
    });
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

  /** Eşten gelen paket: bize aitse işlenir, değilse TTL azaltılarak röle edilir. */
  private onMeshMessage(raw: string) {
    let env: MeshEnvelope;
    try {
      env = JSON.parse(raw) as MeshEnvelope;
    } catch {
      return;
    }
    if (this.seen.has(env.id)) return;
    this.seen.add(env.id);
    if (this.seen.size > 500) this.seen = new Set(Array.from(this.seen).slice(-250));

    if (env.to === this.nodeId || env.to === "*") {
      if (env.kind === "ping") {
        this.sendEnvelope({
          id: randomId("pkt"),
          from: this.nodeId,
          to: env.from,
          ttl: MAX_TTL,
          kind: "pong",
          body: env.body,
          at: Date.now(),
        });
      } else if (env.kind === "pong") {
        const sentAt = Number((env.body as { at?: number })?.at ?? 0);
        if (sentAt) this.emit({ rttMs: Date.now() - sentAt });
      } else if (env.kind === "telemetry" && this.state.online) {
        // Bulutu görebilen düğüm, göremeyen eşin heartbeat'ini onun adına iletir.
        void this.postTelemetry(env.body as Record<string, unknown>);
        this.emit({ lastRelayAt: new Date().toISOString() });
      }
    }

    if (env.to !== this.nodeId && env.ttl > 1) {
      this.sendEnvelope({ ...env, ttl: env.ttl - 1 }, env.from);
      this.emit({ lastRelayAt: new Date().toISOString() });
    }
  }

  /** Paketi açık tüm DataChannel'lara yazar; hiç eş yoksa kuyruğa alır. */
  sendEnvelope(env: MeshEnvelope, exclude?: string) {
    const open = Array.from(this.peers.entries()).filter(
      ([id, p]) => id !== exclude && p.dc?.readyState === "open",
    );
    if (!open.length) {
      writeQueue([...readQueue(), env]);
      this.emit({});
      return false;
    }
    const raw = JSON.stringify(env);
    open.forEach(([, p]) => p.dc?.send(raw));
    this.emit({});
    return true;
  }

  /** Kullanıcı testi: tüm eşlere ping atar, dönen pong ile RTT ölçülür. */
  pingPeers() {
    return this.sendEnvelope({
      id: randomId("pkt"),
      from: this.nodeId,
      to: "*",
      ttl: MAX_TTL,
      kind: "ping",
      body: { at: Date.now() },
      at: Date.now(),
    });
  }

  private async flushQueue() {
    const items = readQueue();
    if (!items.length) return;
    const remaining: MeshEnvelope[] = [];
    for (const env of items) {
      if (env.kind === "telemetry" && this.state.online) {
        const ok = await this.postTelemetry(env.body as Record<string, unknown>);
        if (!ok) remaining.push(env);
        continue;
      }
      const sent = this.sendEnvelope(env);
      if (!sent) remaining.push(env);
    }
    writeQueue(remaining);
    this.emit({});
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
      firmware: "browser-node-1.0",
      hops: directPeers ? 1 : 0,
      packet_loss_pct: this.state.online ? 0 : 100,
      rtt_ms: this.state.rttMs ?? 0,
      note: `tarayici-dugumu · dogrudan-es:${directPeers}`,
      ...(this.state.online ? {} : { error_code: "uplink_offline" }),
    };

    if (this.demoMode) {
      // Demo modu: buluta yazmadan eşlerle P2P ve kuyruk çalışmaya devam eder.
      this.emit({ lastHeartbeatAt: new Date().toISOString(), error: null });
      return;
    }

    if (!this.state.online) {
      // Bulut yok: kuyruğa al ve eşler üzerinden röle etmeyi dene.
      const env: MeshEnvelope = {
        id: randomId("pkt"),
        from: this.nodeId,
        to: "*",
        ttl: MAX_TTL,
        kind: "telemetry",
        body,
        at: Date.now(),
      };
      const relayed = this.sendEnvelope(env);
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
