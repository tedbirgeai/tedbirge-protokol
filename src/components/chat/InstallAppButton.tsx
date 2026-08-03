import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || iosStandalone);
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * "Uygulamayı yükle" düğmesi — telefon, tablet ve bilgisayarda ana ekrana
 * / uygulama listesine ekler. iOS'ta tarayıcı otomatik kurulumu desteklemediği
 * için adım adım yönerge gösterilir.
 */
export function InstallAppButton({ compact = false }: { compact?: boolean }) {
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as InstallPromptEvent;
      setReady(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setReady(false);
      promptRef.current = null;
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    setInstalled(isStandalone());
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const evt = promptRef.current;
    if (!evt) {
      setHelp(true);
      return;
    }
    await evt.prompt();
    const choice = await evt.userChoice;
    promptRef.current = null;
    setReady(false);
    if (choice.outcome === "accepted") setInstalled(true);
  }, []);

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void install()}
        className={
          compact
            ? "wa-press rounded-full p-2 hover:bg-black/5"
            : "wa-press flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white"
        }
        style={compact ? { color: "var(--wa-muted)" } : { background: "var(--wa-accent)" }}
        title="Uygulamayı yükle"
        aria-label="Uygulamayı yükle"
      >
        <Download className="h-[18px] w-[18px]" aria-hidden />
        {!compact && <span>Uygulamayı yükle</span>}
        {!compact || ready ? null : null}
      </button>

      {help && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold" style={{ color: "var(--wa-text)" }}>
                Ana ekrana ekleyin
              </h2>
              <button
                type="button"
                onClick={() => setHelp(false)}
                className="wa-press rounded-full p-1 hover:bg-black/5"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol
              className="mt-3 space-y-2 text-[13.5px] leading-relaxed"
              style={{ color: "var(--wa-muted)" }}
            >
              {isIos() ? (
                <>
                  <li>
                    1. Alt çubuktaki <Share className="inline h-3.5 w-3.5" aria-hidden /> Paylaş
                    düğmesine dokunun.
                  </li>
                  <li>2. “Ana Ekrana Ekle” seçeneğini seçin.</li>
                  <li>3. “Ekle” deyin — Tedbirge artık bir uygulama gibi açılır.</li>
                </>
              ) : (
                <>
                  <li>1. Tarayıcı menüsünü (⋮ veya …) açın.</li>
                  <li>
                    2. “Uygulamayı yükle” / “Ana ekrana ekle” seçeneğine dokunun (Chrome, Edge,
                    Samsung Internet).
                  </li>
                  <li>3. Onaylayın — uygulama simgesi cihazınıza eklenir.</li>
                </>
              )}
            </ol>
            <p className="mt-3 text-[12px]" style={{ color: "var(--wa-muted)" }}>
              Kurulum ücretsizdir ve uygulama çevrimdışıyken de açılır.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
