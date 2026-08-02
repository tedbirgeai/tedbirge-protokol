import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, MessageSquare, QrCode, Smartphone, X } from "lucide-react";
import QRCode from "qrcode";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * "Tedbirge Web / Uygulamayı Edin" paneli.
 * Ana ekrana ekleme (PWA) ve QR ile mobil cihaza aktarma akışlarını yönetir.
 */
export function AppGetPanel() {
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as InstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      promptRef.current = null;
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);
    setShareUrl(`${window.location.origin}/sohbet`);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const evt = promptRef.current;
    if (!evt) {
      setNote(
        "Tarayıcınız otomatik kurulumu desteklemiyor. Menüden “Ana ekrana ekle” (iPhone’da Paylaş → Ana Ekrana Ekle) seçeneğini kullanın.",
      );
      return;
    }
    await evt.prompt();
    const choice = await evt.userChoice;
    promptRef.current = null;
    setCanInstall(false);
    setNote(choice.outcome === "accepted" ? "Uygulama ana ekranınıza eklendi." : "Kurulum iptal edildi.");
  }, []);

  const openQr = useCallback(async () => {
    setQrOpen(true);
    if (qrData) return;
    try {
      const url = `${window.location.origin}/sohbet`;
      setQrData(
        await QRCode.toDataURL(url, { width: 512, margin: 1, color: { dark: "#0b1020", light: "#ffffff" } }),
      );
    } catch {
      setQrData(null);
    }
  }, [qrData]);

  return (
    <section className="border-b border-border/60 bg-card/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
            Tedbirge Web
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Uygulamayı edinin — indirme yok, hesap yok
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Tarayıcıdan hemen kullanın ya da tek dokunuşla ana ekranınıza ekleyin. Telefon, tablet ve
            bilgisayarda aynı uygulama; internet kesildiğinde de çalışmaya devam eder.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              <MessageSquare className="h-4 w-4" /> Tedbirge Web’i aç
            </Link>
            <button
              type="button"
              onClick={() => void install()}
              disabled={installed}
              className="inline-flex items-center gap-2 rounded-sm border border-border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {installed ? "Kurulu" : canInstall ? "Ana ekrana ekle" : "Kurulum talimatı"}
            </button>
            <button
              type="button"
              onClick={() => void openQr()}
              className="inline-flex items-center gap-2 rounded-sm border border-border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
            >
              <QrCode className="h-4 w-4" /> QR ile telefona aktar
            </button>
          </div>

          {note && <p className="mt-4 text-sm text-muted-foreground">{note}</p>}
        </div>

        <div className="rounded-sm border border-border bg-background/70 p-8">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" aria-hidden />
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-primary">
              Her cihazda üç adım
            </p>
          </div>
          <ol className="mt-6 space-y-4 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">1.</span> Bu adresi telefonun tarayıcısında açın veya QR’ı
              okutun.
            </li>
            <li>
              <span className="text-foreground">2.</span> “Ana ekrana ekle” deyin; uygulama simgesi oluşur.
            </li>
            <li>
              <span className="text-foreground">3.</span> Adınızı yazın, sohbet ve arama hazır — kayıt
              gerekmez.
            </li>
          </ol>
        </div>
      </div>

      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="QR kod ile mobil cihaza aktar"
        >
          <div className="w-full max-w-sm rounded-sm border border-border bg-card p-6 text-center">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Telefona aktar
              </p>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {qrData ? (
              <img src={qrData} alt="Tedbirge uygulama bağlantısı QR kodu" className="mx-auto mt-5 w-56" />
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">QR oluşturulamadı.</p>
            )}
            <p className="mt-5 break-all font-mono text-[11px] text-muted-foreground">{shareUrl}</p>
          </div>
        </div>
      )}
    </section>
  );
}
