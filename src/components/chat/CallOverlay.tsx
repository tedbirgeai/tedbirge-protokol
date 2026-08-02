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

/** Tam ekran görüşme katmanı — geleneksel telefon arama deneyimi. */
export function CallOverlay() {
  const call = useCall();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [speaker, setSpeaker] = useState(true);
  const elapsed = useElapsed(call.phase === "active" ? call.startedAt : null);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = getLocalStream();
    if (remoteRef.current) remoteRef.current.srcObject = getRemoteStream();
  }, [call.phase, call.video]);

  useEffect(() => {
    const el = remoteRef.current as (HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el) return;
    el.volume = speaker ? 1 : 0.35;
    void el.setSinkId?.(speaker ? "default" : "communications").catch(() => undefined);
  }, [speaker, call.phase]);

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

  const ctlBase =
    "flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent";

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
              {call.peerAlias} · {label}
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-3xl text-primary">
              {(call.peerAlias || "?").slice(0, 2).toUpperCase()}
            </div>
            <video ref={remoteRef} autoPlay playsInline className="hidden" />
            <p className="mt-6 text-xl font-semibold text-foreground">{call.peerAlias}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          </div>
        )}
      </div>

      {call.error && <p className="pb-4 text-sm text-destructive">{call.error}</p>}

      <div className="flex items-center gap-4 pb-12">
        {call.phase === "ringing" ? (
          <>
            <button
              type="button"
              onClick={() => void acceptCall()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-label="Aramayı kabul et"
            >
              <PhoneIncoming className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => endCall()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              aria-label="Aramayı reddet"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleMute}
              className={ctlBase}
              aria-label={call.muted ? "Mikrofonu aç" : "Mikrofonu kapat"}
            >
              {call.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setSpeaker((v) => !v)}
              className={ctlBase}
              aria-label={speaker ? "Hoparlörü kapat" : "Hoparlörü aç"}
            >
              {speaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            {call.video && (
              <>
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={ctlBase}
                  aria-label={call.cameraOff ? "Kamerayı aç" : "Kamerayı kapat"}
                >
                  {call.cameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
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
              onClick={() => endCall()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
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
