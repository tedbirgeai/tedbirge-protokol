import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { dismissPairing, pairQrPayload, submitPin, usePairing } from "@/lib/chat/pairing";

/**
 * Cihazı Eşleştir modalı — 4 haneli PIN veya QR ile el sıkışma.
 * Eşleşme tamamlanmadan hiçbir mesaj/arama kanalı açılmaz.
 */
export function PairingDialog({ nameOf }: { nameOf: (id: string) => string }) {
  const { session } = usePairing();
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const pin = session?.pin;
  const nodeId = session?.nodeId;

  useEffect(() => {
    if (!pin || !nodeId) {
      setQr(null);
      return;
    }
    let alive = true;
    void QRCode.toDataURL(pairQrPayload(nodeId, pin), { margin: 1, width: 220 }).then((url) => {
      if (alive) setQr(url);
    });
    return () => {
      alive = false;
    };
  }, [pin, nodeId]);

  useEffect(() => {
    setCode("");
  }, [session?.nodeId, session?.role]);

  if (!session) return null;
  const title = nameOf(session.nodeId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="rounded-full p-2" style={{ background: "var(--wa-panel-soft)" }}>
            <ShieldCheck className="h-5 w-5" style={{ color: "var(--wa-accent)" }} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold" style={{ color: "var(--wa-text)" }}>
              Cihazı Eşleştir
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
              {title} ile güvenli kanal açmak için tek seferlik kodu doğrulayın.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dismissPairing(session.nodeId)}
            className="rounded-full p-1.5 hover:bg-black/5"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {session.status === "paired" ? (
          <div className="mt-6 text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--wa-accent)" }}>
              Eşleşme tamamlandı
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
              {title} artık güvenilir cihaz. Mesaj ve arama kanalı açıldı.
            </p>
            <button
              type="button"
              onClick={() => dismissPairing()}
              className="mt-5 w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--wa-accent)" }}
            >
              Sohbete geç
            </button>
          </div>
        ) : session.role === "host" ? (
          <div className="mt-5 text-center">
            <p className="text-xs" style={{ color: "var(--wa-muted)" }}>
              Bu kodu karşı cihaza okutun veya söyleyin:
            </p>
            <p
              className="mt-2 font-mono text-4xl font-bold tracking-[0.35em]"
              style={{ color: "var(--wa-text)" }}
            >
              {session.pin}
            </p>
            {qr && <img src={qr} alt="Eşleşme karekodu" className="mx-auto mt-4 h-40 w-40" />}
            <p className="mt-3 text-[11px]" style={{ color: "var(--wa-muted)" }}>
              Kod 3 dakika geçerlidir. Karşı cihaz kodu girene kadar bekleyin.
            </p>
            {session.error && (
              <p className="mt-2 text-[11px] font-medium text-red-600">{session.error}</p>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <label className="text-xs" style={{ color: "var(--wa-muted)" }}>
              Karşı cihazdaki 4 haneli kodu girin (veya karekod metnini yapıştırın)
            </label>
            <div className="mt-2 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                placeholder="0000"
                className="w-full rounded-lg border px-3 py-2.5 font-mono text-lg tracking-[0.3em] outline-none"
                style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
              />
              <button
                type="button"
                onClick={() => void submitPin(code)}
                className="rounded-lg px-4 text-white"
                style={{ background: "var(--wa-accent)" }}
                aria-label="Kodu doğrula"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            </div>
            {session.error && (
              <p className="mt-2 text-[11px] font-medium text-red-600">{session.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
