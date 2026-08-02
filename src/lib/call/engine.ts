/**
 * Sesli / görüntülü görüşme motoru (WebRTC, çift modlu).
 * ------------------------------------------------------------------
 * Katman A'da bulut STUN ile, Katman B/C'de yerel ağ üzerinden
 * sunucusuz çalışır. Sinyalleşme mesajları mesh zarfları içinde
 * uçtan uca şifreli taşınır; medya akışı DTLS-SRTP ile korunur.
 * Bağlantı düşerse ICE yeniden başlatılır, olmazsa görüşme
 * sesli nota / sakla-ilet moduna düşer.
 */

import { useSyncExternalStore } from "react";
import { bootMeshBus, onMesh } from "@/lib/mesh-bus";
import { sendMesh } from "@/lib/node-runtime";
import { getAlias } from "@/lib/chat/profile";

export type CallPhase = "idle" | "ringing" | "outgoing" | "active" | "reconnecting" | "ended";

export type CallState = {
  phase: CallPhase;
  peerId: string | null;
  peerAlias: string;
  video: boolean;
  muted: boolean;
  cameraOff: boolean;
  startedAt: number | null;
  error: string | null;
};

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
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
};

const listeners = new Set<() => void>();
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let pendingOffer: RTCSessionDescriptionInit | null = null;
let booted = false;
let ringTimer: ReturnType<typeof setTimeout> | null = null;

function publish(patch: Partial<CallState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getLocalStream() {
  return localStream;
}
export function getRemoteStream() {
  return remoteStream;
}

async function ensureMedia(video: boolean) {
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: video ? { width: { ideal: 960 }, facingMode: "user" } : false,
  });
  return localStream;
}

function createPc(peerId: string) {
  const conn = new RTCPeerConnection(ICE);
  remoteStream = new MediaStream();
  conn.ontrack = (e) => {
    e.streams[0]?.getTracks().forEach((t) => remoteStream?.addTrack(t));
    listeners.forEach((l) => l());
  };
  conn.onicecandidate = (e) => {
    if (e.candidate) void sendMesh("call", peerId, { t: "ice", candidate: e.candidate.toJSON() });
  };
  conn.onconnectionstatechange = () => {
    if (conn.connectionState === "connected") {
      publish({ phase: "active", startedAt: state.startedAt ?? Date.now(), error: null });
    } else if (conn.connectionState === "disconnected") {
      publish({ phase: "reconnecting" });
      void restartIce(peerId);
    } else if (conn.connectionState === "failed") {
      publish({ phase: "reconnecting", error: "Bağlantı zayıf — yeniden deneniyor." });
      void restartIce(peerId);
    }
  };
  pc = conn;
  return conn;
}

async function restartIce(peerId: string) {
  if (!pc) return;
  try {
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    await sendMesh("call", peerId, { t: "offer", sdp: offer.sdp, video: state.video, alias: getAlias(), restart: true });
  } catch {
    publish({ error: "Bağlantı kurulamadı. Mesaj olarak göndermeyi deneyin." });
  }
}

/* ------------------------------ eylemler ------------------------------ */

export async function startCall(peerId: string, video: boolean, alias?: string) {
  bootCalls();
  publish({ phase: "outgoing", peerId, peerAlias: alias ?? peerId, video, error: null, startedAt: null, muted: false, cameraOff: false });
  try {
    const stream = await ensureMedia(video);
    const conn = createPc(peerId);
    stream.getTracks().forEach((t) => conn.addTrack(t, stream));
    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);
    await sendMesh("call", peerId, { t: "offer", sdp: offer.sdp, video, alias: getAlias() });
    ringTimer = setTimeout(() => {
      if (state.phase === "outgoing") endCall("Cevap yok.");
    }, 45_000);
  } catch {
    endCall("Mikrofona erişilemedi. Tarayıcı izinlerini kontrol edin.");
  }
}

export async function acceptCall() {
  if (!state.peerId || !pendingOffer) return;
  const peerId = state.peerId;
  try {
    const stream = await ensureMedia(state.video);
    const conn = createPc(peerId);
    stream.getTracks().forEach((t) => conn.addTrack(t, stream));
    await conn.setRemoteDescription(pendingOffer);
    const answer = await conn.createAnswer();
    await conn.setLocalDescription(answer);
    pendingOffer = null;
    await sendMesh("call", peerId, { t: "answer", sdp: answer.sdp });
    publish({ phase: "active", startedAt: Date.now() });
  } catch {
    endCall("Görüşme başlatılamadı.");
  }
}

export function endCall(reason?: string) {
  if (state.peerId) void sendMesh("call", state.peerId, { t: "bye" });
  cleanup();
  publish({ phase: reason ? "ended" : "idle", error: reason ?? null });
  setTimeout(() => {
    if (state.phase === "ended") publish({ phase: "idle", peerId: null, error: null });
  }, 3000);
}

function cleanup() {
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = null;
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  remoteStream = null;
  pendingOffer = null;
  try {
    pc?.close();
  } catch {
    /* zaten kapalı */
  }
  pc = null;
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

/* ------------------------------ sinyalleşme ------------------------------ */

type CallSignal = {
  t?: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  video?: boolean;
  alias?: string;
  restart?: boolean;
};

async function onCallSignal(from: string, raw: unknown) {
  const p = raw as CallSignal;
  if (!p?.t) return;

  if (p.t === "offer" && p.sdp) {
    const desc: RTCSessionDescriptionInit = { type: "offer", sdp: p.sdp };
    if (p.restart && pc) {
      await pc.setRemoteDescription(desc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendMesh("call", from, { t: "answer", sdp: answer.sdp });
      return;
    }
    if (state.phase !== "idle" && state.phase !== "ended") {
      void sendMesh("call", from, { t: "busy" });
      return;
    }
    pendingOffer = desc;
    publish({ phase: "ringing", peerId: from, peerAlias: p.alias ?? from, video: Boolean(p.video), error: null });
    return;
  }

  if (p.t === "answer" && p.sdp && pc) {
    if (ringTimer) clearTimeout(ringTimer);
    await pc.setRemoteDescription({ type: "answer", sdp: p.sdp });
    publish({ phase: "active", startedAt: state.startedAt ?? Date.now() });
    return;
  }

  if (p.t === "ice" && p.candidate && pc) {
    try {
      await pc.addIceCandidate(p.candidate);
    } catch {
      /* geç gelen aday */
    }
    return;
  }

  if (p.t === "bye" || p.t === "busy") {
    cleanup();
    publish({ phase: "ended", error: p.t === "busy" ? "Karşı taraf meşgul." : null });
    setTimeout(() => publish({ phase: "idle", peerId: null, error: null }), 2500);
  }
}

export function bootCalls() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  bootMeshBus();
  onMesh("call", (from, body) => void onCallSignal(from, body));
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
