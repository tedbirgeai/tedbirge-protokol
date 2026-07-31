import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Link } from "@tanstack/react-router";
import { describeTier, joinUrl, scanLocalNetwork, useAccessTier } from "@/lib/access-tiers";
import { ensureOfflineGrant, type OfflineGrant } from "@/lib/offline-license";

/**
 * Melez erişim kartı: bulut / yerel ağ / bağımsız ada katmanını sade dille
 * gösterir ve iki tıkla saha işlemi sunar (yerel tarama · QR ile katılım).
 */
export function HybridAccessCard() {
  const access = useAccessTier();
  const info = describeTier(access);
  const [qr, setQr] = useState("");
  const [grant, setGrant] = useState<OfflineGrant | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    void ensureOfflineGrant().then(setGrant);
  }, []);

  useEffect(() => {
    if (!showQr) return;
    QRCode.toDataURL(joinUrl(access), {
      width: 512,
      margin: 1,
      color: { dark: "#e8ecff", light: "#00000000" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [showQr, access]);

  const dot =
    info.tone === "ok" ? "bg-primary" : info.tone === "warn" ? "bg-amber-400" : "bg-destructive";

  return (
    <div className="rounded-sm border border-border bg-card/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${dot} ${info.tone === "ok" ? "animate-pulse" : ""}`} aria-hidden />
          <div>
            <p className="text-sm font-semibold text-foreground">{info.label}</p>
            <p className="text-sm text-muted-foreground">{info.message}</p>
          </div>
        </div>
        {grant?.active && (
          <span className="rounded-sm border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
            Çevrimdışı Çalışma Zırhı Aktif
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void scanLocalNetwork()}
          disabled={access.scanning}
          className="rounded-sm bg-primary px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {access.scanning ? "Taranıyor…" : "Yerel ağda taramayı başlat"}
        </button>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="rounded-sm border border-border px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-accent"
        >
          {showQr ? "QR'ı gizle" : "Saha QR ile katıl"}
        </button>
      </div>

      {showQr && (
        <div className="mt-5 flex flex-col items-start gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center">
          {qr ? (
            <img src={qr} alt="Tedbirge ağına katılım QR kodu" className="h-40 w-40" />
          ) : (
            <div className="h-40 w-40 animate-pulse rounded-sm bg-muted" aria-hidden />
          )}
          <div className="text-sm text-muted-foreground">
            <p>Yeni cihaz bu kodu okutup tek dokunuşla ağa katılır. Kurulum, hesap veya internet gerekmez.</p>
            <p className="mt-2 break-all font-mono text-xs text-foreground">{joinUrl(access)}</p>
            <Link to="/katil" className="mt-2 inline-block text-primary hover:underline">
              Katılım sayfasını aç →
            </Link>
          </div>
        </div>
      )}

      <p className="mt-5 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
        Bağlantı koptuğunda sistem sırayla yerel ağa, gerekirse tamamen bağımsız ada moduna kendi
        geçer. Bu geçişler otomatiktir; ayar yapmanız gerekmez.
      </p>
    </div>
  );
}
