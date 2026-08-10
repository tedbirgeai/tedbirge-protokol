import { useCallback, useState } from "react";
import { Download, Share, X } from "lucide-react";

import { isPublishedOrigin, promptInstall, useInstallState } from "@/lib/pwa-install";

/**
 * Pazarlama sayfalarındaki "Uygulamayı Yükle" düğmesi.
 * Android/Chrome: doğrudan tarayıcının yerel kurulum penceresi açılır.
 * iOS/Safari: "Paylaş → Ana Ekrana Ekle" yönergesi gösterilir.
 */
export function InstallAppCta({
  variant = "primary",
  label = "Uygulamayı Yükle",
  className = "",
}: {
  variant?: "primary" | "outline" | "nav";
  label?: string;
  className?: string;
}) {
  const { installed, ios } = useInstallState();
  const [help, setHelp] = useState(false);

  const onClick = useCallback(async () => {
    const result = await promptInstall();
    if (result === "unavailable") setHelp(true);
  }, []);

  const base =
    "inline-flex items-center gap-2 rounded-sm font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-opacity";
  const styles =
    variant === "primary"
      ? "bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
      : variant === "nav"
        ? "border border-border px-4 py-2 text-foreground transition-colors hover:bg-secondary"
        : "border border-border px-6 py-3 text-foreground transition-colors hover:bg-secondary";

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        className={`${base} ${styles} ${className}`}
      >
        <Download className="h-4 w-4" aria-hidden />
        {label}
      </button>

      {help && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-background/85 p-4 backdrop-blur sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Uygulamayı ana ekrana ekleme yönergesi"
          onClick={() => setHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-sm border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Ana ekrana ekleyin</h2>
              <button
                type="button"
                onClick={() => setHelp(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {ios ? (
                <>
                  <li>
                    1. Safari alt çubuğundaki <Share className="inline h-3.5 w-3.5" aria-hidden />{" "}
                    “Paylaş” düğmesine dokunun.
                  </li>
                  <li>2. “Ana Ekrana Ekle” seçeneğine dokunun.</li>
                  <li>3. “Ekle” deyin — Tedbirge bir uygulama gibi açılır.</li>
                </>
              ) : (
                <>
                  {!isPublishedOrigin() && (
                    <li>Önce yayınlanmış Tedbirge adresini yeni bir sekmede açın.</li>
                  )}
                  <li>1. Tarayıcı menüsünü (⋮ veya …) açın.</li>
                  <li>2. “Uygulamayı yükle” / “Ana ekrana ekle” seçeneğine dokunun.</li>
                  <li>3. Onaylayın — uygulama simgesi cihazınıza eklenir.</li>
                </>
              )}
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">
              Kurulum ücretsizdir; uygulama çevrimdışıyken de açılır.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
