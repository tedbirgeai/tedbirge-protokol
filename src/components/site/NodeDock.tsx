import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  describeNode,
  hasSeenGuide,
  markGuideSeen,
  pingNodePeers,
  startNode,
  stopNode,
  testFieldRoute,
  useNodeRuntime,
} from "@/lib/node-runtime";

const FALLBACK_ORIGIN = "https://tedbirge-gateway.lovable.app";

/**
 * Kalıcı düğüm doku — her sayfanın en üstünde durur.
 * Tek ekranda uçtan uca akış: 1) Düğümü başlat 2) Telefonu bağla 3) Durum.
 */
export function NodeDock() {
  const state = useNodeRuntime();
  const status = describeNode(state);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [routeTest, setRouteTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = `${origin}/saha`;

  useEffect(() => {
    QRCode.toDataURL(link, { width: 360, margin: 1, color: { dark: "#e8ecff", light: "#00000000" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [link]);

  // Rehber: düğüm hiç başlatılmadıysa ilk ziyarette kendiliğinden açılır.
  useEffect(() => {
    if (!state.running && !hasSeenGuide()) {
      setOpen(true);
      markGuideSeen();
    }
  }, [state.running]);

  const runRouteTest = useCallback(async () => {
    setTesting(true);
    setRouteTest(await testFieldRoute(origin));
    setTesting(false);
  }, [origin]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setRouteTest({ ok: false, message: `Kopyalanamadı. Linki elle yazın: ${link}` });
    }
  }

  const tone =
    status.tone === "off"
      ? "border-destructive/60 bg-destructive/15 text-destructive"
      : status.tone === "offline"
        ? "border-destructive/60 bg-destructive/10 text-destructive"
        : "border-primary/60 bg-primary/15 text-primary";

  return (
    <div className="print-hide sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <span className={`shrink-0 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${tone}`}>
            ● {status.text}
          </span>
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Kuyruk {status.queued} · {open ? "kapat" : "adımlar"}
          </span>
        </button>
        {state.running ? (
          <button
            onClick={stopNode}
            className="shrink-0 rounded-sm border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-secondary"
          >
            Durdur
          </button>
        ) : (
          <button
            onClick={() => void startNode()}
            className="shrink-0 rounded-sm bg-primary px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
          >
            1 · Düğümü başlat
          </button>
        )}
      </div>

      {state.notice && (
        <div className="border-t border-border/60 bg-secondary/40">
          <p className="mx-auto max-w-6xl px-4 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {state.notice}
          </p>
        </div>
      )}


      {open && (
        <div className="border-t border-border/60 bg-card/60">
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">1 · Düğümü başlat</strong> — üstteki yeşil düğmeye
                basın. Kayıt, e-posta veya kurulum yok.
              </li>
              <li>
                <strong className="text-foreground">2 · Telefonu bağla</strong> — QR'ı okutun ya da linki
                telefona gönderin; açılan sayfada yine “Düğümü başlat” deyin.
              </li>
              <li>
                <strong className="text-foreground">3 · Durumu izle</strong> — bu şerit her ekranda üstte
                kalır: eş sayısı, kuyruk ve çevrimdışı durumu canlı görünür.
              </li>
            </ol>

            <div className="grid gap-4 rounded-sm border border-border bg-background/60 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs text-foreground">{link}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={copy}
                    className="rounded-sm border border-primary/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-primary hover:bg-primary/10"
                  >
                    {copied ? "Kopyalandı" : "Linki kopyala"}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Tedbirge düğüm linki: ${link}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-sm border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-secondary"
                  >
                    Telefona gönder
                  </a>
                  <button
                    onClick={() => void runRouteTest()}
                    disabled={testing}
                    className="rounded-sm border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-secondary disabled:opacity-50"
                  >
                    {testing ? "Test ediliyor…" : "QR yönlendirme testi"}
                  </button>
                  <button
                    onClick={pingNodePeers}
                    disabled={!state.running}
                    className="rounded-sm border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-secondary disabled:opacity-50"
                  >
                    Eş ölç
                  </button>
                </div>
                {routeTest && (
                  <p className={`mt-3 text-xs ${routeTest.ok ? "text-primary" : "text-destructive"}`}>
                    {routeTest.ok ? "✓ " : "✕ "}
                    {routeTest.message}
                  </p>
                )}
                {state.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Kimlik: {state.nodeId || "…"} · RTT {state.rttMs != null ? `${state.rttMs} ms` : "—"}
                </p>
              </div>
              {qr && (
                <img
                  src={qr}
                  alt="Tedbirge saha düğümü erişim linkinin QR kodu"
                  width={132}
                  height={132}
                  loading="lazy"
                  className="mx-auto size-[132px] rounded-sm border border-border/60 bg-background/40 p-2"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
