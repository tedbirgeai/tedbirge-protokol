import { useState } from "react";
import { MapPin, Siren, X } from "lucide-react";
import { broadcastSos, sendLocation } from "@/lib/chat/engine";
import { currentPosition } from "@/lib/chat/location";
import { pressFeedback } from "@/lib/chat/sounds";

const panel = { background: "var(--wa-panel)", color: "var(--wa-text)" } as const;

/**
 * Acil durum penceresi.
 * ------------------------------------------------------------------
 * İki eylem sunar:
 *  - Konum paylaş: yalnızca açık sohbete gider, çevrimdışı harita
 *    karesiyle birlikte.
 *  - Acil durum yayını (SOS): tüm sohbetlere ve menzildeki tüm
 *    düğümlere en yüksek öncelikle konum + pil + not gönderir.
 *    İnternet gerekmez; mesh üzerinden yayılır.
 */
export function EmergencyDialog({
  open,
  convId,
  onClose,
}: {
  open: boolean;
  convId: string | null;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"loc" | "sos" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="wa-scope w-full max-w-md rounded-xl p-6 shadow-xl"
        style={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Siren className="h-5 w-5" style={{ color: "#e03131" }} aria-hidden /> Konum ve acil
            durum
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="wa-press rounded-full p-2"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />
          </button>
        </div>

        <p className="mt-2 text-xs" style={{ color: "var(--wa-muted)" }}>
          Konum bilgisi uçtan uca şifrelenir ve yalnızca seçtiğiniz alıcılara gider. Harita karesi
          cihazınızda çizilir; internet olmasa da görünür.
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 200))}
          rows={2}
          placeholder="Kısa not (ör. 3. kat, enkaz altındayım, 2 kişiyiz)"
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
        />

        <button
          type="button"
          disabled={!convId || busy !== null}
          onClick={() => {
            if (!convId) return;
            pressFeedback();
            setBusy("loc");
            setErr(null);
            setMsg(null);
            void currentPosition()
              .then((p) => sendLocation(convId, p, note))
              .then(() => {
                setMsg("Konum bu sohbete gönderildi.");
                setNote("");
              })
              .catch((e: Error) => setErr(e.message))
              .finally(() => setBusy(null));
          }}
          className="wa-press mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[13px] font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--wa-accent)" }}
        >
          <MapPin className="h-4 w-4" />
          {busy === "loc" ? "Konum alınıyor…" : "Konumumu bu sohbete gönder"}
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            pressFeedback();
            setBusy("sos");
            setErr(null);
            setMsg(null);
            void broadcastSos(note)
              .then((r) => {
                setMsg(
                  `Acil durum yayını gönderildi · ${r.conversations} sohbet, ${r.peers} yakın düğüm` +
                    (r.hasLocation ? " · konum eklendi" : " · konum alınamadı"),
                );
                setNote("");
              })
              .catch((e: Error) => setErr(e.message))
              .finally(() => setBusy(null));
          }}
          className="wa-press mt-2 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: "#e03131" }}
        >
          <Siren className="h-4 w-4" />
          {busy === "sos" ? "Yayın gönderiliyor…" : "ACİL DURUM YAYINI (SOS)"}
        </button>

        <p className="mt-2 text-[11px]" style={{ color: "var(--wa-muted)" }}>
          SOS; tüm sohbetlerinize ve menzildeki tüm Tedbirge düğümlerine en yüksek öncelikle gider.
          Bağlantı yoksa kuyrukta bekler ve ilk temasta iletilir.
        </p>

        {msg && (
          <p className="mt-3 text-xs" style={{ color: "var(--wa-accent)" }}>
            {msg}
          </p>
        )}
        {err && (
          <p className="mt-3 text-xs" style={{ color: "#e03131" }}>
            {err}
          </p>
        )}
      </div>
    </div>
  );
}
