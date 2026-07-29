import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { BrowserNode, getBrowserNodeId, type BrowserNodeState } from "@/lib/browser-node";

const AUTO_KEY = "tedbirge.browser-node.auto";
const FALLBACK_ORIGIN = "https://tedbirge-gateway.lovable.app";

/**
 * Tek ekranlı onboarding: cihazı (telefon/tablet/bilgisayar) donanımsız
 * gerçek bir Tedbirge düğümü yapar. Kayıt/lisans gerekmez.
 */
export function BrowserNodeCard({ licenseKey }: { licenseKey?: string }) {
  const nodeRef = useRef<BrowserNode | null>(null);
  const [state, setState] = useState<BrowserNodeState | null>(null);
  const [nodeId, setNodeId] = useState("");
  const [link, setLink] = useState(`${FALLBACK_ORIGIN}/saha`);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    setNodeId(getBrowserNodeId());
    setLink(`${window.location.origin}/saha`);
  }, []);

  useEffect(() => {
    QRCode.toDataURL(link, { width: 400, margin: 1, color: { dark: "#e8ecff", light: "#00000000" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [link]);

  const start = useCallback(() => {
    if (nodeRef.current) return;
    const node = new BrowserNode(licenseKey, setState);
    nodeRef.current = node;
    void node.start();
    window.localStorage.setItem(AUTO_KEY, "1");
  }, [licenseKey]);

  const stop = useCallback(() => {
    nodeRef.current?.stop();
    nodeRef.current = null;
    window.localStorage.setItem(AUTO_KEY, "0");
    setState(null);
  }, []);

  // Bir kez açıldıysa uygulama her açıldığında kendiliğinden başlar (otonom mod).
  useEffect(() => {
    if (window.localStorage.getItem(AUTO_KEY) === "1" && !nodeRef.current) start();
    return () => {
      nodeRef.current?.stop();
      nodeRef.current = null;
    };
  }, [start]);

  const running = Boolean(state?.running);

  // Eşleri elle "pingle"mek gerekmez: düğüm çalışırken otomatik ölçülür.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => nodeRef.current?.pingPeers(), 15_000);
    const first = setTimeout(() => nodeRef.current?.pingPeers(), 1_500);
    return () => {
      clearInterval(t);
      clearTimeout(first);
    };
  }, [running]);

  const directPeers = state?.peers.filter((p) => p.direct).length ?? 0;
  const queued = state?.queued ?? 0;
  const online = state?.online !== false;

  const statusText = !running
    ? "Kapalı — başlatın"
    : directPeers > 0
      ? `Bağlı · ${directPeers} eş`
      : online
        ? "Çalışıyor · eş aranıyor"
        : `Çevrimdışı · kuyrukta ${queued}`;
  const statusTone = !running
    ? "border-border text-muted-foreground"
    : directPeers > 0 || online
      ? "border-primary/60 bg-primary/10 text-primary"
      : "border-destructive/60 bg-destructive/10 text-destructive";

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-sm border border-primary/40 bg-primary/5 p-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
        Tarayıcı düğümü · donanımsız · kayıt gerekmez
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Bu cihazı 2 adımda düğüme dönüştür</h2>

      {/* 1) Tek büyük buton + canlı durum */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {running ? (
          <button
            onClick={stop}
            className="rounded-sm border border-border px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Düğümü durdur
          </button>
        ) : (
          <button
            onClick={start}
            className="rounded-sm bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            1 · Düğümü başlat
          </button>
        )}
        <span className={`rounded-sm border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] ${statusTone}`}>
          ● {statusText}
        </span>
        <span className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Kuyruk: {queued}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Kurulum, kablo, hesap yok. Düğüm kimliği bu cihazda üretilir; aynı linki açan diğer Tedbirge
        cihazlarıyla <strong className="text-foreground">doğrudan (P2P)</strong> eşleşir. Bağlantı
        koparsa paketler cihazda kuyruğa yazılır, dönünce sırayla iletilir.{" "}
        <strong className="text-foreground">Eşleri elle pinglemenize gerek yok</strong> — düğüm
        çalışırken bağlantı kalitesi (RTT) otomatik ölçülür.
      </p>

      {/* 2) İkinci cihazı bağla */}
      <div className="mt-6 grid gap-6 rounded-sm border border-border bg-card/60 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
            2 · Telefonu (veya ikinci cihazı) bağla
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Telefonda <strong className="text-foreground">yeni bir e-posta ya da kayıt gerekmez</strong>.
            QR'ı okutun veya aşağıdaki linki telefonun tarayıcısına yapıştırın, açılan sayfada yine
            “Düğümü başlat” deyin. İki cihaz birbirini “doğrudan eş” olarak görür.
          </p>
          <p className="mt-3 break-all font-mono text-sm text-foreground">{link}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={copy}
              className="rounded-sm border border-primary/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary hover:bg-primary/10"
            >
              {copied ? "Kopyalandı" : "Linki kopyala"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Tedbirge düğüm linki: ${link}`)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Telefona / ekibe gönder
            </a>
          </div>
        </div>
        {qr && (
          <img
            src={qr}
            alt="Tedbirge düğüm erişim linkinin QR kodu"
            width={160}
            height={160}
            loading="lazy"
            className="mx-auto size-40 rounded-sm border border-border/60 bg-background/40 p-2"
          />
        )}
      </div>

      {/* Ayrıntılar: teknik göstergeler ve sınırlar */}
      <button
        onClick={() => setDetails((v) => !v)}
        className="mt-5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {details ? "Ayrıntıları gizle" : "Ayrıntılar · düğüm kimliği, sınırlar, eş listesi"}
      </button>

      {details && (
        <div className="mt-4 space-y-5">
          <div className="rounded-sm border border-border bg-background/60 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Düğüm kimliği</p>
            <p className="mt-1 break-all font-mono text-sm text-foreground">{nodeId || "…"}</p>
            <dl className="mt-4 grid gap-1 font-mono text-[11px] sm:grid-cols-2">
              <Line k="Durum" v={running ? "çalışıyor" : "kapalı"} ok={running} />
              <Line
                k="Bulut"
                v={!licenseKey ? "demo (kayıt yok)" : online ? "bağlı" : "kopuk (kuyruk)"}
                ok={licenseKey ? online : undefined}
              />
              <Line k="Doğrudan eş" v={String(directPeers)} ok={directPeers > 0} />
              <Line k="Kuyruk" v={String(queued)} ok={queued === 0} />
              <Line
                k="Son heartbeat"
                v={state?.lastHeartbeatAt ? new Date(state.lastHeartbeatAt).toLocaleTimeString("tr-TR") : "—"}
                ok={Boolean(state?.lastHeartbeatAt)}
              />
              <Line k="Eş RTT" v={state?.rttMs != null ? `${state.rttMs} ms` : "ölçülüyor…"} ok={state?.rttMs != null} />
            </dl>
            <button
              onClick={() => nodeRef.current?.pingPeers()}
              disabled={!running}
              className="mt-4 rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
            >
              Şimdi ölç (isteğe bağlı)
            </button>
            {!licenseKey && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Demo modu: eşleşme, P2P röle ve çevrimdışı kuyruk çalışır; panelde kalıcı kayıt için lisans gerekir.
              </p>
            )}
            {state?.error && <p className="mt-3 text-[11px] text-destructive">{state.error}</p>}
          </div>

          <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-3">
            {[
              {
                t: "Çevrimdışı kuyruk",
                b: "Bağlantı koptuğunda paketler cihazda kalıcı saklanır (en fazla 200 kayıt) ve bağlantı dönünce sırayla iletilir.",
              },
              {
                t: "Sınırlamalar",
                b: "Tarayıcı yalnızca cihazın Wi-Fi/hücresel radyosunu kullanır; menzil ~50-100 m. LoRa/HaLow/TVWS menzili için radyo modülü gerekir.",
              },
              {
                t: "Yükseltme yolu",
                b: "Lisans + gateway/röle donanımı eklendiğinde aynı düğüm kimliği korunur; 6-15 km zincir ve panel kaydı devreye girer.",
              },
            ].map((c) => (
              <div key={c.t} className="bg-background/60 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">{c.t}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.b}</p>
              </div>
            ))}
          </div>

          {running && state && state.peers.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {state.peers.map((p) => (
                <div key={p.nodeId} className="rounded-sm border border-border bg-background/60 p-3">
                  <p className="font-mono text-[11px] text-foreground">{p.nodeId}</p>
                  <p className={`mt-1 font-mono text-[11px] ${p.direct ? "text-primary" : "text-muted-foreground"}`}>
                    ● {p.direct ? "doğrudan P2P" : p.state}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Line({ k, v, ok }: { k: string; v: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
      <dd className={ok ? "text-primary" : "text-muted-foreground"}>{v}</dd>
    </div>
  );
}
