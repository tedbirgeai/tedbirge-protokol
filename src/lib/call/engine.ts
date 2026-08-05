/**
 * Sesli / görüntülü görüşme motoru (WebRTC, çok eşli).
 * ------------------------------------------------------------------
 * Katman A'da bulut STUN ile, Katman B/C'de yerel ağ üzerinden
 * sunucusuz çalışır. Sinyalleşme mesajları mesh zarfları içinde
 * uçtan uca şifreli taşınır; medya akışı DTLS-SRTP ile korunur.
 *
 * Konferans: SFU yoktur. 2-4 kişilik görüşmelerde her katılımcıya
 * ayrı bir RTCPeerConnection kurulur (tam örgü / full-mesh). Bağlantı
 * düşerse ICE yeniden başlatılır; olmazsa görüşme sesli nota /
 * sakla-ilet moduna düşer.
 *
 * Kalite: her 2 saniyede getStats() okunur; gecikme (RTT), titreşim
 * (jitter) ve paket kaybı 0-4 arası çubuk göstergeye dönüştürülür.
 */

import { useSyncExternalStore } from "react";
import { bootMeshBus, onMesh } from "@/lib/mesh-bus";
import { sendMesh } from "@/lib/node-runtime";
import { getAlias } from "@/lib/chat/profile";
import { showChatNotification } from "@/lib/chat/push";
import { getBrowserNodeId } from "@/lib/browser-node";

export type CallPhase = "idle" | "ringing" | "outgoing" | "active" | "reconnecting" | "ended";

export type CallQuality = {
  /** 0 = kopuk, 4 = mükemmel. */
  bars: 0 | 1 | 2 | 3 | 4;
  rttMs: number | null;
  jitterMs: number | null;
  lossPct: number | null;
  label: string;
};

export type Participant = { peerId: string; alias: string; connected: boolean };

export type CallState = {
  phase: CallPhase;
  peerId: string | null;
  peerAlias: string;
  video: boolean;
  muted: boolean;
  cameraOff: boolean;
  startedAt: number | null;
  error: string | null;
  /** Konferans katılımcıları (birebir görüşmede tek eleman). */
  participants: Participant[];
  conference: boolean;
  quality: CallQuality;
  /** Kaçıncı yeniden bağlanma denemesi. */
  reconnects: number;
  /** Uzak medya izi değiştiğinde oynatıcıyı yeniden bağlamak için artar. */
  streamVersion: number;
  /** Karşı cihaz teklifi aldı ve telefonu çalıyor (ağ ulaştı). */
  remoteRinging: boolean;
};

const ICE: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
    // Simetrik NAT / mobil operatör ağlarında doğrudan yol kurulamazsa
    // aktarma sunucusu devreye girer. İçerik uçtan uca şifreli kalır (DTLS-SRTP).
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turns:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 4,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

/**
 * Gönderici ayarları: görüntüde çözünürlük yerine akıcılığı korur,
 * zayıf bağlantıda kaliteyi kademeli düşürür, sesi tek kanalda tutar.
 */
async function tuneSenders(pc: RTCPeerConnection) {
  for (const sender of pc.getSenders()) {
    if (!sender.track) continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      if (sender.track.kind === "video") {
        // Ayrıntı korunur, ağ zayıflarsa önce kare hızı düşer.
        sender.track.contentHint = "motion";
        params.degradationPreference = "balanced";
        params.encodings[0].maxBitrate = 2_500_000;
        params.encodings[0].maxFramerate = 30;
        delete params.encodings[0].scaleResolutionDownBy;
      } else {
        sender.track.contentHint = "speech";
        params.encodings[0].maxBitrate = 64_000;
      }
      await sender.setParameters(params);
    } catch {
      /* bazı tarayıcılar parametre değişimini kısıtlar; görüşme etkilenmez */
    }
  }
}



const IDLE_QUALITY: CallQuality = {
  bars: 0,
  rttMs: null,
  jitterMs: null,
  lossPct: null,
  label: "—",
};

let state: CallState = {
  phase: "idle",
  peerId: null,
  peerAlias: "",
  video: false,
  muted: false,
  cameraOff: false,
  startedAt: null,
  error: null,
  participants: [],
  conference: false,
  quality: IDLE_QUALITY,
  reconnects: 0,
  streamVersion: 0,
  remoteRinging: false,
};

const listeners = new Set<() => void>();

type Leg = { pc: RTCPeerConnection; stream: MediaStream; alias: string; polite: boolean };
type PendingOffer = { desc: RTCSessionDescriptionInit; alias: string; video: boolean };

const legs = new Map<string, Leg>();
let localStream: MediaStream | null = null;
let pendingOffers = new Map<string, PendingOffer>();
let booted = false;
let outgoingTimer: ReturnType<typeof setTimeout> | null = null;
/** Giden aramada teklif tekrarlama sıklığı (ms). */
const DIAL_RETRY_MS = 2500;
let dialRetryTimer: ReturnType<typeof setInterval> | null = null;
const incomingTimers = new Map<string, ReturnType<typeof setTimeout>>();
let statsTimer: ReturnType<typeof setInterval> | null = null;
const pendingIce = new Map<string, RTCIceCandidateInit[]>();
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const restarting = new Set<string>();
const MAX_RECONNECTS = 3;
const RING_TIMEOUT_MS = 45_000;

function publish(patch: Partial<CallState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function syncParticipants() {
  publish({
    participants: Array.from(legs.entries()).map(([peerId, leg]) => ({
      peerId,
      alias: leg.alias,
      connected: leg.pc.connectionState === "connected",
    })),
  });
}

export function getLocalStream() {
  return localStream;
}

/** Birebir görüşmede karşı tarafın akışı (geriye dönük uyumluluk). */
export function getRemoteStream() {
  const first = legs.values().next().value as Leg | undefined;
  return first?.stream ?? null;
}

export function getPeerStream(peerId: string) {
  return legs.get(peerId)?.stream ?? null;
}

/**
 * Mikrofon/kamera açar. İzin verilmezse ya da cihaz yoksa görüşme
 * DÜŞMEZ: arama ekranı açık kalır, yalnızca dinleme kipinde sürer.
 */
async function ensureMedia(video: boolean): Promise<MediaStream | null> {
  if (localStream) return localStream;
  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
    aspectRatio: { ideal: 16 / 9 },
    facingMode: "user",
  };
  const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  const got = (s: MediaStream) => {
    localStream = s;
    // Ekrandaki önizleme yeni akışı hemen bağlasın.
    publish({ streamVersion: state.streamVersion + 1 });
    return s;
  };

  try {
    return got(
      await navigator.mediaDevices.getUserMedia({ audio, video: video ? videoConstraints : false }),
    );
  } catch {
    /* istenen çözünürlük desteklenmiyor olabilir */
  }
  try {
    return got(await navigator.mediaDevices.getUserMedia({ audio, video }));
  } catch {
    /* izin yok */
  }
  if (video) {
    try {
      return got(await navigator.mediaDevices.getUserMedia({ audio, video: false }));
    } catch {
      /* mikrofon da yok */
    }
  }
  localStream = null;
  return null;
}




function createLeg(peerId: string, alias: string) {
  const existing = legs.get(peerId);
  if (existing) return existing;
  const pc = new RTCPeerConnection(ICE);
  const stream = new MediaStream();
  const leg: Leg = { pc, stream, alias, polite: peerId > nodeSelf() };
  pc.ontrack = (e) => {
    e.streams[0]?.getTracks().forEach((t) => {
      if (!stream.getTracks().includes(t)) stream.addTrack(t);
    });
    publish({ streamVersion: state.streamVersion + 1 });
  };
  pc.onicecandidate = (e) => {
    if (e.candidate)
      void sendMesh("call", peerId, {
        t: "ice",
        candidate: e.candidate.toJSON(),
        at: Date.now(),
      });
  };
  pc.onconnectionstatechange = () => {
    syncParticipants();
    const anyConnected = Array.from(legs.values()).some(
      (l) => l.pc.connectionState === "connected",
    );
    if (pc.connectionState === "connected") {
      const reconnectTimer = reconnectTimers.get(peerId);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimers.delete(peerId);
      publish({ phase: "active", startedAt: state.startedAt ?? Date.now(), error: null });
      startStats();
    } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
      if (!anyConnected) {
        publish({
          phase: "reconnecting",
          reconnects: state.reconnects + 1,
          error: pc.connectionState === "failed" ? "Bağlantı zayıf — yeniden deneniyor." : null,
        });
      }
      if (state.reconnects < MAX_RECONNECTS) void restartIce(peerId);
      else endCall("Bağlantı yeniden kurulamadı.");
    }
  };
  legs.set(peerId, leg);
  syncParticipants();
  return leg;
}

function nodeSelf(): string {
  return getBrowserNodeId();
}

async function applyPendingIce(peerId: string, pc: RTCPeerConnection) {
  const queued = pendingIce.get(peerId) ?? [];
  pendingIce.delete(peerId);
  for (const candidate of queued) {
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      /* eski veya geçersiz aday görüşmeyi durdurmaz */
    }
  }
}

async function restartIce(peerId: string) {
  const leg = legs.get(peerId);
  if (!leg || restarting.has(peerId) || leg.pc.signalingState !== "stable") return;
  restarting.add(peerId);
  try {
    const offer = await leg.pc.createOffer({ iceRestart: true });
    await leg.pc.setLocalDescription(offer);
    await sendMesh("call", peerId, {
      t: "offer",
      sdp: offer.sdp,
      video: state.video,
      alias: getAlias(),
      restart: true,
      at: Date.now(),
    });
    const previous = reconnectTimers.get(peerId);
    if (previous) clearTimeout(previous);
    reconnectTimers.set(
      peerId,
      setTimeout(() => {
        const current = legs.get(peerId);
        if (current && current.pc.connectionState !== "connected") {
          if (state.reconnects >= MAX_RECONNECTS) endCall("Bağlantı yeniden kurulamadı.");
          else {
            publish({ reconnects: state.reconnects + 1 });
            void restartIce(peerId);
          }
        }
      }, 8_000),
    );
  } catch {
    publish({ error: "Bağlantı kurulamadı. Mesaj olarak göndermeyi deneyin." });
  } finally {
    restarting.delete(peerId);
  }
}

/* ------------------------------ kalite ------------------------------ */

function scoreOf(rtt: number | null, jitter: number | null, loss: number | null): CallQuality {
  if (rtt === null && jitter === null && loss === null) return IDLE_QUALITY;
  let bars = 4;
  if ((rtt ?? 0) > 150 || (jitter ?? 0) > 20 || (loss ?? 0) > 1) bars = 3;
  if ((rtt ?? 0) > 300 || (jitter ?? 0) > 40 || (loss ?? 0) > 3) bars = 2;
  if ((rtt ?? 0) > 500 || (jitter ?? 0) > 80 || (loss ?? 0) > 8) bars = 1;
  if ((rtt ?? 0) > 900 || (loss ?? 0) > 20) bars = 0;
  const label =
    bars >= 4
      ? "Mükemmel"
      : bars === 3
        ? "İyi"
        : bars === 2
          ? "Orta"
          : bars === 1
            ? "Zayıf"
            : "Kopuk";
  return { bars: bars as CallQuality["bars"], rttMs: rtt, jitterMs: jitter, lossPct: loss, label };
}

async function readStats() {
  let rtt: number | null = null;
  let jitter: number | null = null;
  let loss: number | null = null;
  for (const leg of legs.values()) {
    if (leg.pc.connectionState !== "connected") continue;
    try {
      const report = await leg.pc.getStats();
      report.forEach((s) => {
        const r = s as unknown as Record<string, number | string>;
        if (
          s.type === "candidate-pair" &&
          r["state"] === "succeeded" &&
          typeof r["currentRoundTripTime"] === "number"
        ) {
          const ms = Math.round((r["currentRoundTripTime"] as number) * 1000);
          rtt = rtt === null ? ms : Math.max(rtt, ms);
        }
        if (s.type === "inbound-rtp" && r["kind"] === "audio") {
          if (typeof r["jitter"] === "number") {
            const ms = Math.round((r["jitter"] as number) * 1000);
            jitter = jitter === null ? ms : Math.max(jitter, ms);
          }
          const lost = Number(r["packetsLost"] ?? 0);
          const recv = Number(r["packetsReceived"] ?? 0);
          if (recv + lost > 0) {
            const pct = Math.round((lost / (recv + lost)) * 1000) / 10;
            loss = loss === null ? pct : Math.max(loss, pct);
          }
        }
      });
    } catch {
      /* istatistik okunamadı */
    }
  }
  publish({ quality: scoreOf(rtt, jitter, loss) });
}

function startStats() {
  if (statsTimer) return;
  statsTimer = setInterval(() => void readStats(), 2000);
}

function stopStats() {
  if (statsTimer) clearInterval(statsTimer);
  statsTimer = null;
}

/* ------------------------------ eylemler ------------------------------ */

/** Yerel akışı bağlar; izin yoksa yalnız-dinleme hatları açılır. */
function attachLocal(pc: RTCPeerConnection, stream: MediaStream | null, video: boolean) {
  if (stream) {
    stream.getTracks().forEach((t) => {
      if (!pc.getSenders().some((s) => s.track === t)) pc.addTrack(t, stream);
    });
    return;
  }
  if (pc.getTransceivers().length === 0) {
    pc.addTransceiver("audio", { direction: "recvonly" });
    if (video) pc.addTransceiver("video", { direction: "recvonly" });
  }
}

async function dial(peerId: string, alias: string, video: boolean) {
  const stream = await ensureMedia(video);
  const leg = createLeg(peerId, alias);
  attachLocal(leg.pc, stream, video);
  await tuneSenders(leg.pc);


  const offer = await leg.pc.createOffer();
  await leg.pc.setLocalDescription(offer);
  const sent = await sendMesh("call", peerId, {
    t: "offer",
    sdp: offer.sdp,
    video,
    alias: getAlias(),
    at: Date.now(),
  });
  // Karşı cihaz kapalı/arka planda olabilir: telefonu çaldırmak için
  // uyandırma bildirimi yollanır (içerik gönderilmez).
  void import("@/lib/chat/webpush").then((m) => m.wakePeer(peerId, "call")).catch(() => {});
  return sent;
}

/**
 * Çağrı ısrarı: karşı cihaz uyanana kadar teklif periyodik tekrarlanır.
 * Telefon mantığı — hat kurulana ya da süre dolana dek "aranıyor" sürer.
 */
function startDialRetry(peerId: string, video: boolean) {
  stopDialRetry();
  dialRetryTimer = setInterval(() => {
    if (state.phase !== "outgoing" || state.peerId !== peerId) {
      stopDialRetry();
      return;
    }
    const leg = legs.get(peerId);
    const sdp = leg?.pc.localDescription?.sdp;
    if (!sdp) return;
    void sendMesh("call", peerId, {
      t: "offer",
      sdp,
      video,
      alias: getAlias(),
      at: Date.now(),
    });
    if (!state.remoteRinging)
      void import("@/lib/chat/webpush").then((m) => m.wakePeer(peerId, "call")).catch(() => {});
  }, DIAL_RETRY_MS);
}

function stopDialRetry() {
  if (dialRetryTimer) clearInterval(dialRetryTimer);
  dialRetryTimer = null;
}

export async function startCall(peerId: string, video: boolean, alias?: string) {
  bootCalls();
  if (state.phase !== "idle" && state.phase !== "ended") return;
  if (!peerId || peerId === nodeSelf()) {
    publish({ phase: "ended", error: "Kendi cihazınızı arayamazsınız." });
    return;
  }
  publish({
    phase: "outgoing",
    peerId,
    peerAlias: alias ?? peerId,
    video,
    error: null,
    startedAt: null,
    muted: false,
    cameraOff: false,
    conference: false,
    reconnects: 0,
    quality: IDLE_QUALITY,
    remoteRinging: false,
  });
  try {
    await dial(peerId, alias ?? peerId, video);
    // Teklif ilk turda ulaşmasa bile arama düşürülmez: karşı cihaz açıldığı
    // anda yakalansın diye teklif tekrarlanır, süre dolunca "Cevap yok".
    startDialRetry(peerId, video);
    if (outgoingTimer) clearTimeout(outgoingTimer);
    outgoingTimer = setTimeout(() => {
      if (state.phase === "outgoing") endCall("Cevap yok.");
    }, RING_TIMEOUT_MS);
  } catch {
    // Arama ekranı kapanmaz: kullanıcı kırmızı tuşla kendisi sonlandırır.
    publish({ error: "Mikrofona erişilemedi — yalnız dinleme kipinde deneniyor." });
    if (outgoingTimer) clearTimeout(outgoingTimer);
    outgoingTimer = setTimeout(() => {
      if (state.phase === "outgoing") endCall("Cevap yok.");
    }, RING_TIMEOUT_MS);
  }

}


/** Grup / konferans araması — her katılımcıya ayrı bağlantı (2-4 kişi). */
export async function startConference(
  peers: Array<{ peerId: string; alias?: string }>,
  video: boolean,
  title = "Grup görüşmesi",
) {
  bootCalls();
  if (state.phase !== "idle" && state.phase !== "ended") return;
  const list = peers.filter((p) => p.peerId && p.peerId !== nodeSelf()).slice(0, 4);
  if (!list.length) return;
  publish({
    phase: "outgoing",
    peerId: list[0]!.peerId,
    peerAlias: title,
    video,
    error: null,
    startedAt: null,
    muted: false,
    cameraOff: false,
    conference: true,
    reconnects: 0,
    quality: IDLE_QUALITY,
    remoteRinging: false,
  });
  try {
    for (const p of list) await dial(p.peerId, p.alias ?? p.peerId, video);
    if (outgoingTimer) clearTimeout(outgoingTimer);
    outgoingTimer = setTimeout(() => {
      if (state.phase === "outgoing") endCall("Kimse katılmadı.");
    }, RING_TIMEOUT_MS);
  } catch (error) {
    endCall(
      error instanceof Error && error.message === "peer-unavailable"
        ? "Katılımcı cihazları şu anda erişilebilir değil."
        : "Görüşme başlatılamadı.",
    );
  }
}

export async function acceptCall() {
  const entries = Array.from(pendingOffers.entries());
  if (!entries.length) return;
  for (const timer of incomingTimers.values()) clearTimeout(timer);
  incomingTimers.clear();
  try {
    const stream = await ensureMedia(state.video);
    let accepted = 0;
    for (const [peerId, offer] of entries) {
      try {
      const leg = createLeg(peerId, offer.alias || peerId);
      attachLocal(leg.pc, stream, state.video);

      await tuneSenders(leg.pc);
      await leg.pc.setRemoteDescription(offer.desc);

      await applyPendingIce(peerId, leg.pc);
      const answer = await leg.pc.createAnswer();
      await leg.pc.setLocalDescription(answer);
      const answered = await sendMesh("call", peerId, {
        t: "answer",
        sdp: answer.sdp,
        alias: getAlias(),
        at: Date.now(),
      });
      if (!answered) throw new Error("answer-unavailable");
        pendingOffers.delete(peerId);
        accepted += 1;
      } catch {
        const failed = legs.get(peerId);
        failed?.pc.close();
        legs.delete(peerId);
      }
    }
    if (!accepted) throw new Error("no accepted leg");
    publish({ phase: "active", startedAt: Date.now() });
    startStats();
  } catch {
    endCall("Görüşme başlatılamadı.");
  }
}

export function endCall(reason?: string) {
  const peers = new Set([...legs.keys(), ...pendingOffers.keys()]);
  for (const peerId of peers) void sendMesh("call", peerId, { t: "bye", at: Date.now() });
  cleanup();
  publish({ phase: reason ? "ended" : "idle", error: reason ?? null, remoteRinging: false });
  setTimeout(() => {
    if (state.phase === "ended")
      publish({
        phase: "idle",
        peerId: null,
        error: null,
        participants: [],
        quality: IDLE_QUALITY,
      });
  }, 3000);
}

/** Konferansta tek bir katılımcıyı düşürür. */
export function dropParticipant(peerId: string) {
  const leg = legs.get(peerId);
  if (!leg) return;
  void sendMesh("call", peerId, { t: "bye", at: Date.now() });
  try {
    leg.pc.close();
  } catch {
    /* zaten kapalı */
  }
  legs.delete(peerId);
  syncParticipants();
  if (!legs.size) endCall();
}

function cleanup() {
  if (outgoingTimer) clearTimeout(outgoingTimer);
  stopDialRetry();
  outgoingTimer = null;
  for (const timer of incomingTimers.values()) clearTimeout(timer);
  incomingTimers.clear();
  stopStats();
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  pendingOffers = new Map();
  pendingIce.clear();
  restarting.clear();
  for (const timer of reconnectTimers.values()) clearTimeout(timer);
  reconnectTimers.clear();
  for (const leg of legs.values()) {
    try {
      leg.pc.close();
    } catch {
      /* zaten kapalı */
    }
  }
  legs.clear();
}

export function toggleMute() {
  const next = !state.muted;
  localStream?.getAudioTracks().forEach((t) => (t.enabled = !next));
  publish({ muted: next });
}

export function toggleCamera() {
  const next = !state.cameraOff;
  localStream?.getVideoTracks().forEach((t) => (t.enabled = !next));
  publish({ cameraOff: next });
}

let facing: "user" | "environment" = "user";
let switchingCamera = false;

/** Ön / arka kamera değişimi — görüşme kesilmeden akış değiştirilir. */
export async function switchCamera() {
  if (!legs.size || !state.video || switchingCamera) return;
  switchingCamera = true;
  facing = facing === "user" ? "environment" : "user";
  try {
    const fresh = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 960 } },
      audio: false,
    });
    const track = fresh.getVideoTracks()[0];
    if (!track) return;
    for (const leg of legs.values()) {
      const sender = leg.pc.getSenders().find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(track);
      await tuneSenders(leg.pc);
    }

    localStream?.getVideoTracks().forEach((t) => {
      t.stop();
      localStream?.removeTrack(t);
    });
    localStream?.addTrack(track);
    track.enabled = !state.cameraOff;
    listeners.forEach((l) => l());
  } catch {
    publish({ error: "Kamera değiştirilemedi." });
  } finally {
    switchingCamera = false;
  }
}

/* ------------------------------ sinyalleşme ------------------------------ */

type CallSignal = {
  t?: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  video?: boolean;
  alias?: string;
  restart?: boolean;
  at?: number;
};

/** Bayat teklif penceresi: bundan eski sinyaller çalmaz (kuyruk tekrarı). */
const OFFER_FRESH_MS = 60_000;
const CONTROL_FRESH_MS = 90_000;

async function onCallSignal(from: string, raw: unknown) {
  const p = raw as CallSignal;
  if (!p?.t) return;
  // Kendi cihazımızdan dönen sinyal asla arama olarak gösterilmez.
  if (!from || from === nodeSelf()) return;
  const age = typeof p.at === "number" ? Date.now() - p.at : Number.POSITIVE_INFINITY;
  // Eski sürümün tarihsiz çağrı paketleri bulut röleden gelirse çalıştırılmaz;
  // böylece uygulama açılışında eski arama/ICE/bitirme sinyali canlanamaz.
  if (p.t === "offer" ? age > OFFER_FRESH_MS : age > CONTROL_FRESH_MS) return;


  if (p.t === "offer" && p.sdp) {
    const desc: RTCSessionDescriptionInit = { type: "offer", sdp: p.sdp };
    const leg = legs.get(from);
    if (p.restart && leg) {
      // İki uç aynı anda ICE yeniden başlatırsa yalnız polite uç geri çekilir.
      if (leg.pc.signalingState !== "stable") {
        if (!leg.polite) return;
        await leg.pc.setLocalDescription({ type: "rollback" });
      }
      await leg.pc.setRemoteDescription(desc);
      await applyPendingIce(from, leg.pc);
      const answer = await leg.pc.createAnswer();
      await leg.pc.setLocalDescription(answer);
      await sendMesh("call", from, { t: "answer", sdp: answer.sdp, at: Date.now() });
      return;
    }
    // Aynı anda iki taraf da aradıysa deterministik "perfect negotiation":
    // küçük düğüm kimliği arayan kalır; büyük kimlik kendi teklifini geri
    // alıp gelen teklifi cevaplar. Böylece iki taraf da meşgule düşmez.
    if (state.phase === "outgoing" && state.peerId === from && leg) {
      if (!leg.polite) return;
      try {
        await leg.pc.setLocalDescription({ type: "rollback" });
        await leg.pc.setRemoteDescription(desc);
        await applyPendingIce(from, leg.pc);
        const answer = await leg.pc.createAnswer();
        await leg.pc.setLocalDescription(answer);
        await sendMesh("call", from, {
          t: "answer",
          sdp: answer.sdp,
          alias: getAlias(),
          at: Date.now(),
        });
        if (outgoingTimer) clearTimeout(outgoingTimer);
        outgoingTimer = null;
        publish({ phase: "active", startedAt: Date.now(), error: null });
      } catch {
        endCall("Eşzamanlı arama çözülemedi.");
      }
      return;
    }
    // Görüşme sürerken yeni katılımcı → konferansa dahil et.
    if (state.phase === "active") {
      try {
        if (leg && leg.pc.signalingState !== "stable") return;
        const stream = await ensureMedia(state.video);
        const fresh = createLeg(from, p.alias ?? from);
        attachLocal(fresh.pc, stream, state.video);

        await tuneSenders(fresh.pc);
        await fresh.pc.setRemoteDescription(desc);

        await applyPendingIce(from, fresh.pc);
        const answer = await fresh.pc.createAnswer();
        await fresh.pc.setLocalDescription(answer);
        await sendMesh("call", from, {
          t: "answer",
          sdp: answer.sdp,
          alias: getAlias(),
          at: Date.now(),
        });
        publish({ conference: legs.size > 1 });
      } catch {
        void sendMesh("call", from, { t: "busy", at: Date.now() });
      }
      return;
    }
    if (state.phase !== "idle" && state.phase !== "ended" && state.phase !== "ringing") {
      void sendMesh("call", from, { t: "busy", at: Date.now() });
      return;
    }
    pendingOffers.set(from, { desc, alias: p.alias ?? from, video: Boolean(p.video) });
    publish({
      phase: "ringing",
      peerId: from,
      peerAlias: p.alias ?? from,
      video: Boolean(p.video) || Array.from(pendingOffers.values()).some((offer) => offer.video),
      error: null,
      conference: pendingOffers.size > 1,
    });
    // Arayan tarafa "telefonun çaldı" bilgisi: ekranda ARANIYOR yerine ÇALIYOR yazar.
    void sendMesh("call", from, { t: "ring", at: Date.now() });
    const previousTimer = incomingTimers.get(from);
    if (previousTimer) clearTimeout(previousTimer);
    incomingTimers.set(
      from,
      setTimeout(() => {
        pendingOffers.delete(from);
        incomingTimers.delete(from);
        if (state.phase === "ringing" && pendingOffers.size === 0) endCall("Cevapsız arama.");
      }, RING_TIMEOUT_MS),
    );
    void showChatNotification({
      title: `📞 ${p.alias ?? from}`,
      body: p.video ? "Görüntülü arama" : "Sesli arama",
      kind: "call",
      tag: "tedbirge-call",
    });
    return;
  }

  if (p.t === "ring") {
    if (state.phase === "outgoing" && (legs.has(from) || state.peerId === from)) {
      publish({ remoteRinging: true, error: null });
    }
    return;
  }

  if (p.t === "answer" && p.sdp) {
    const leg = legs.get(from);
    if (!leg) return;
    if (outgoingTimer) clearTimeout(outgoingTimer);
    outgoingTimer = null;
    stopDialRetry();
    if (p.alias) leg.alias = p.alias;
    await leg.pc.setRemoteDescription({ type: "answer", sdp: p.sdp });
    await applyPendingIce(from, leg.pc);
    publish({ phase: "active", startedAt: state.startedAt ?? Date.now(), remoteRinging: false });
    syncParticipants();
    startStats();
    return;
  }

  if (p.t === "ice" && p.candidate) {
    const leg = legs.get(from);
    if (!leg || !leg.pc.remoteDescription) {
      pendingIce.set(from, [...(pendingIce.get(from) ?? []), p.candidate]);
      return;
    }
    try {
      await leg.pc.addIceCandidate(p.candidate);
    } catch {
      /* geç gelen aday */
    }
    return;
  }

  if (p.t === "bye" || p.t === "busy") {
    pendingOffers.delete(from);
    const incomingTimer = incomingTimers.get(from);
    if (incomingTimer) clearTimeout(incomingTimer);
    incomingTimers.delete(from);
    const leg = legs.get(from);
    if (leg) {
      try {
        leg.pc.close();
      } catch {
        /* zaten kapalı */
      }
      legs.delete(from);
      syncParticipants();
    }
    if (legs.size > 0) return; // konferans sürüyor
    cleanup();
    publish({ phase: "ended", error: p.t === "busy" ? "Karşı taraf meşgul." : null });
    setTimeout(
      () =>
        publish({
          phase: "idle",
          peerId: null,
          error: null,
          participants: [],
          quality: IDLE_QUALITY,
        }),
      2500,
    );
  }
}

export function bootCalls() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  bootMeshBus();
  onMesh("call", (from, body) => void onCallSignal(from, body));
  window.addEventListener("pagehide", () => {
    const peers = new Set([...legs.keys(), ...pendingOffers.keys()]);
    for (const peerId of peers) void sendMesh("call", peerId, { t: "bye", at: Date.now() });
  });
}

export function useCall(): CallState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
