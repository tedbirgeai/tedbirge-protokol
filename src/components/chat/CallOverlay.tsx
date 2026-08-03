import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  PhoneIncoming,
  Volume2,
  VolumeX,
  SwitchCamera,
} from "lucide-react";
import {
  acceptCall,
  endCall,
  getLocalStream,
  getRemoteStream,
  switchCamera,
  toggleCamera,
  toggleMute,
  useCall,
} from "@/lib/call/engine";
import type { CallQuality } from "@/lib/call/engine";
import {
  callEndSound,
  pressFeedback,
  startRingback,
  startRingtone,
  stopRing,
} from "@/lib/chat/sounds";

function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return "";
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Bağlantı kalitesi çubuk göstergesi (jitter + paket kaybı + RTT). */
function QualityBars({ q }: { q: CallQuality }) {
  const color = q.bars >= 3 ? "var(--wa-accent, #25d366)" : q.bars === 2 ? "#f2a33c" : "#e03131";
  return (
    <span
      className="inline-flex items-end gap-[2px]"
      title={`${q.label}${q.rttMs !== null ? ` · ${q.rttMs} ms` : ""}${q.lossPct !== null ? ` · %${q.lossPct} kayıp` : ""}`}
      aria-label={`Bağlantı kalitesi: ${q.label}`}
    >
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: 4 + i * 3,
            borderRadius: 1,
            background: i <= q.bars ? color : "currentColor",
            opacity: i <= q.bars ? 1 : 0.25,
          }}
        />
      ))}
    </span>
  );
}

/** Tam ekran görüşme katmanı — geleneksel telefon arama deneyimi. */
export function CallOverlay() {
  const call = useCall();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [speaker, setSpeaker] = useState(true);
  const [playBlocked, setPlayBlocked] = useState(false);
  const elapsed = useElapsed(call.phase === "active" ? call.startedAt : null);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = getLocalStream();
    const remote = remoteRef.current;
    if (remote) {
      remote.srcObject = getRemoteStream();
      if (call.phase === "active") {
        void remote
          .play()
          .then(() => setPlayBlocked(false))
          .catch(() => setPlayBlocked(true));
      }
    }
  }, [call.phase, call.video, call.streamVersion]);

  async function enableCallAudio() {
    pressFeedback();
    const remote = remoteRef.current;
    if (!remote) return;
    remote.muted = false;
    remote.volume = 1;
    try {
      await remote.play();
      setPlayBlocked(false);
    } catch {
      setPlayBlocked(true);
    }
  }

  useEffect(() => {
    const el = remoteRef.current as
      | (HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> })
      | null;
    if (!el) return;
    el.volume = speaker ? 1 : 0.35;
    void el.setSinkId?.(speaker ? "default" : "communications").catch(() => undefined);
  }, [speaker, call.phase]);

  /** Zil / çalıyor tonu — geleneksel telefon deneyimi. */
  useEffect(() => {
    if (call.phase === "ringing") startRingtone();
    else if (call.phase === "outgoing") startRingback();
    else {
      stopRing();
      if (call.phase === "ended") callEndSound();
    }
    return () => stopRing();
  }, [call.phase]);

  if (call.phase === "idle") return null;

  const label =
    call.phase === "ringing"
      ? "Gelen arama"
      : call.phase === "outgoing"
        ? "Aranıyor…"
        : call.phase === "reconnecting"
          ? "Bağlantı yeniden kuruluyor…"
          : call.phase === "ended"
            ? "Görüşme bitti"
            : elapsed || "Görüşme sürüyor";

  const statusLine =
    call.phase === "reconnecting" && call.reconnects > 0
      ? `${label} (${call.reconnects}. deneme)`
      : label;

  const ctlBase =
    "wa-press flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-accent";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur">
      <div className="relative flex w-full max-w-3xl flex-1 items-center justify-center p-6">
        {call.video ? (
          <>
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className="h-full w-full rounded-sm border border-border bg-card object-cover"
            />
            <video
              ref={localRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-8 right-8 h-40 w-28 rounded-sm border border-border object-cover"
            />
            <div className="absolute left-8 top-8 rounded-full bg-background/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {call.peerAlias} · {statusLine}
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-3xl text-primary">
              {(call.peerAlias || "?").slice(0, 2).toUpperCase()}
            </div>
            <video ref={remoteRef} autoPlay playsInline className="hidden" />
            <p className="mt-6 text-xl font-semibold text-foreground">{call.peerAlias}</p>
            <p className="mt-1 flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {statusLine}
              {call.phase === "active" && <QualityBars q={call.quality} />}
            </p>
            {call.phase === "active" && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Bağlantı: {call.quality.label}
                {call.quality.rttMs !== null ? ` · ${call.quality.rttMs} ms` : ""}
                {call.quality.jitterMs !== null ? ` · titreşim ${call.quality.jitterMs} ms` : ""}
                {call.quality.lossPct !== null ? ` · kayıp %${call.quality.lossPct}` : ""}
              </p>
            )}
            {call.conference && call.participants.length > 0 && (
              <ul className="mt-4 flex flex-wrap justify-center gap-2">
                {call.participants.map((p) => (
                  <li
                    key={p.peerId}
                    className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground"
                  >
                    {p.alias} · {p.connected ? "bağlı" : "bekliyor"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {call.error && <p className="pb-4 text-sm text-destructive">{call.error}</p>}
      {playBlocked && call.phase === "active" && (
        <button
          type="button"
          onClick={() => void enableCallAudio()}
          className="wa-press mb-4 flex items-center gap-2 rounded-sm border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
        >
          <Volume2 className="h-4 w-4" />
          Görüşme sesini aç
        </button>
      )}

      <div className="flex items-center gap-4 pb-12">
        {call.phase === "ringing" ? (
          <>
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                void acceptCall();
              }}
              className="wa-press wa-ring flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-label="Aramayı kabul et"
            >
              <PhoneIncoming className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                endCall();
              }}
              className="wa-press flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              aria-label="Aramayı reddet"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                toggleMute();
              }}
              className={ctlBase}
              aria-label={call.muted ? "Mikrofonu aç" : "Mikrofonu kapat"}
            >
              {call.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                setSpeaker((v) => !v);
              }}
              className={ctlBase}
              aria-label={speaker ? "Hoparlörü kapat" : "Hoparlörü aç"}
            >
              {speaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            {call.video && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    toggleCamera();
                  }}
                  className={ctlBase}
                  aria-label={call.cameraOff ? "Kamerayı aç" : "Kamerayı kapat"}
                >
                  {call.cameraOff ? (
                    <VideoOff className="h-5 w-5" />
                  ) : (
                    <Video className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void switchCamera()}
                  className={ctlBase}
                  aria-label="Kamerayı değiştir"
                >
                  <SwitchCamera className="h-5 w-5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                endCall();
              }}
              className="wa-press flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              aria-label="Görüşmeyi bitir"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
