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
};

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

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
};

const listeners = new Set<() => void>();

type Leg = { pc: RTCPeerConnection; stream: MediaStream; alias: string; polite: boolean };

const legs = new Map<string, Leg>();
let localStream: MediaStream | null = null;
let pendingOffers = new Map<string, RTCSessionDescriptionInit>();
let booted = false;
let ringTimer: ReturnType<typeof setTimeout> | null = null;
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

async function ensureMedia(video: boolean) {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: video ? { width: { ideal: 960 }, facingMode: "user" } : false,
  });
  return localStream;
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
    if (e.candidate) void sendMesh("call", peerId, { t: "ice", candidate: e.candidate.toJSON() });
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

async function dial(peerId: string, alias: string, video: boolean) {
  const stream = await ensureMedia(video);
  const leg = createLeg(peerId, alias);
  stream.getTracks().forEach((t) => {
    if (!leg.pc.getSenders().some((s) => s.track === t)) leg.pc.addTrack(t, stream);
  });
  const offer = await leg.pc.createOffer();
  await leg.pc.setLocalDescription(offer);
  await sendMesh("call", peerId, { t: "offer", sdp: offer.sdp, video, alias: getAlias(), at: Date.now() });
}

export async function startCall(peerId: string, video: boolean, alias?: string) {
  bootCalls();
  if (state.phase !== "idle" && state.phase !== "ended") return;
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
  });
  try {
    await dial(peerId, alias ?? peerId, video);
    ringTimer = setTimeout(() => {
      if (state.phase === "outgoing") endCall("Cevap yok.");
    }, RING_TIMEOUT_MS);
  } catch {
    endCall("Mikrofona erişilemedi. Tarayıcı izinlerini kontrol edin.");
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
  const list = peers.slice(0, 4);
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
  });
  try {
    for (const p of list) await dial(p.peerId, p.alias ?? p.peerId, video);
    ringTimer = setTimeout(() => {
      if (state.phase === "outgoing") endCall("Kimse katılmadı.");
    }, RING_TIMEOUT_MS);
  } catch {
    endCall("Görüşme başlatılamadı.");
  }
}

export async function acceptCall() {
  const entries = Array.from(pendingOffers.entries());
  if (!entries.length) return;
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = null;
  try {
    const stream = await ensureMedia(state.video);
    let accepted = 0;
    for (const [peerId, offer] of entries) {
      try {
      const leg = createLeg(peerId, state.peerAlias || peerId);
      stream.getTracks().forEach((t) => {
        if (!leg.pc.getSenders().some((s) => s.track === t)) leg.pc.addTrack(t, stream);
      });
      await leg.pc.setRemoteDescription(offer);
      await applyPendingIce(peerId, leg.pc);
      const answer = await leg.pc.createAnswer();
      await leg.pc.setLocalDescription(answer);
      await sendMesh("call", peerId, { t: "answer", sdp: answer.sdp, alias: getAlias() });
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
  for (const peerId of peers) void sendMesh("call", peerId, { t: "bye" });
  cleanup();
  publish({ phase: reason ? "ended" : "idle", error: reason ?? null });
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
  void sendMesh("call", peerId, { t: "bye" });
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
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = null;
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

async function onCallSignal(from: string, raw: unknown) {
  const p = raw as CallSignal;
  if (!p?.t) return;
  // Kendi cihazımızdan dönen sinyal asla arama olarak gösterilmez.
  if (!from || from === nodeSelf()) return;
  if (p.t === "offer" && typeof p.at === "number" && Date.now() - p.at > OFFER_FRESH_MS) return;


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
      await sendMesh("call", from, { t: "answer", sdp: answer.sdp });
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
        await sendMesh("call", from, { t: "answer", sdp: answer.sdp, alias: getAlias() });
        if (ringTimer) clearTimeout(ringTimer);
        ringTimer = null;
        publish({ phase: "active", startedAt: Date.now(), error: null });
      } catch {
        endCall("Eşzamanlı arama çözülemedi.");
      }
      return;
    }
    // Görüşme sürerken yeni katılımcı → konferansa dahil et.
    if (state.phase === "active") {
      try {
        const stream = await ensureMedia(state.video);
        const fresh = createLeg(from, p.alias ?? from);
        stream.getTracks().forEach((t) => {
          if (!fresh.pc.getSenders().some((s) => s.track === t)) fresh.pc.addTrack(t, stream);
        });
        await fresh.pc.setRemoteDescription(desc);
        await applyPendingIce(from, fresh.pc);
        const answer = await fresh.pc.createAnswer();
        await fresh.pc.setLocalDescription(answer);
        await sendMesh("call", from, { t: "answer", sdp: answer.sdp, alias: getAlias() });
        publish({ conference: legs.size > 1 });
      } catch {
        void sendMesh("call", from, { t: "busy" });
      }
      return;
    }
    if (state.phase !== "idle" && state.phase !== "ended" && state.phase !== "ringing") {
      void sendMesh("call", from, { t: "busy" });
      return;
    }
    pendingOffers.set(from, desc);
    publish({
      phase: "ringing",
      peerId: from,
      peerAlias: p.alias ?? from,
      video: Boolean(p.video),
      error: null,
      conference: pendingOffers.size > 1,
    });
    if (ringTimer) clearTimeout(ringTimer);
    ringTimer = setTimeout(() => {
      if (state.phase === "ringing" && pendingOffers.has(from)) endCall("Cevapsız arama.");
    }, RING_TIMEOUT_MS);
    void showChatNotification({
      title: `📞 ${p.alias ?? from}`,
      body: p.video ? "Görüntülü arama" : "Sesli arama",
      kind: "call",
      tag: "tedbirge-call",
    });
    return;
  }

  if (p.t === "answer" && p.sdp) {
    const leg = legs.get(from);
    if (!leg) return;
    if (ringTimer) clearTimeout(ringTimer);
    if (p.alias) leg.alias = p.alias;
    await leg.pc.setRemoteDescription({ type: "answer", sdp: p.sdp });
    await applyPendingIce(from, leg.pc);
    publish({ phase: "active", startedAt: state.startedAt ?? Date.now() });
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
    for (const peerId of peers) void sendMesh("call", peerId, { t: "bye" });
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
