import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserNode, getBrowserNodeId, type BrowserNodeState } from "@/lib/browser-node";

const AUTO_KEY = "tedbirge.browser-node.auto";

/**
 * Cihazı (telefon/tablet/bilgisayar) fiziksel donanım kurmadan
 * gerçek bir Tedbirge düğümü olarak çalıştıran kart.
 */
export function BrowserNodeCard({ licenseKey }: { licenseKey?: string }) {
  const nodeRef = useRef<BrowserNode | null>(null);
  const [state, setState] = useState<BrowserNodeState | null>(null);
  const [nodeId, setNodeId] = useState("");

  useEffect(() => setNodeId(getBrowserNodeId()), []);

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
  const directPeers = state?.peers.filter((p) => p.direct).length ?? 0;

  return (
    <div className="rounded-sm border border-primary/40 bg-primary/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Tarayıcı düğümü · donanımsız</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Bu cihazı düğüme dönüştür</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Kurulum yok, kablo yok. Bu düğme bu telefonu/tableti/bilgisayarı gerçek bir Tedbirge
            düğümü yapar: kimliği üretilir, panele heartbeat gönderir, yakınındaki diğer Tedbirge
            cihazlarıyla <strong className="text-foreground">doğrudan (P2P) </strong> bağlantı kurar ve
            bulutu göremeyen eşin paketini onun adına röle eder. Bağlantı koparsa paketler kalıcı
            kuyruğa yazılır, dönünce sırayla iletilir.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Sınır: tarayıcı yalnızca cihazın Wi-Fi/hücresel radyosunu kullanabilir. LoRa/HaLow/TVWS
            gibi uzun menzilli taşıyıcılar için ayrı radyo modülü gerekir; onlar olmadan da mesh
            çalışır ama menzil cihazın kendi radyosu kadardır.
          </p>
        </div>

        <div className="min-w-[17rem] rounded-sm border border-border bg-card/60 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Düğüm kimliği</p>
          <p className="mt-1 break-all font-mono text-sm text-foreground">{nodeId || "…"}</p>

          <dl className="mt-4 space-y-1 font-mono text-[11px]">
            <Line k="Durum" v={running ? "çalışıyor" : "kapalı"} ok={running} />
            <Line k="Bulut" v={state?.online === false ? "kopuk (kuyruk)" : "bağlı"} ok={state?.online !== false} />
            <Line k="Doğrudan eş" v={String(directPeers)} ok={directPeers > 0} />
            <Line k="Kuyruk" v={String(state?.queued ?? 0)} ok={(state?.queued ?? 0) === 0} />
            <Line k="Son heartbeat" v={state?.lastHeartbeatAt ? new Date(state.lastHeartbeatAt).toLocaleTimeString("tr-TR") : "—"} ok={Boolean(state?.lastHeartbeatAt)} />
            <Line k="Eş RTT" v={state?.rttMs != null ? `${state.rttMs} ms` : "—"} ok={state?.rttMs != null} />
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            {running ? (
              <button
                onClick={stop}
                className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
              >
                Düğümü durdur
              </button>
            ) : (
              <button
                onClick={start}
                disabled={!licenseKey}
                className="rounded-sm bg-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50"
              >
                Düğümü başlat
              </button>
            )}
            <button
              onClick={() => nodeRef.current?.pingPeers()}
              disabled={!running}
              className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
            >
              Eşleri pingle
            </button>
          </div>

          {!licenseKey && (
            <p className="mt-3 text-[11px] text-muted-foreground">Önce bir lisans oluşturun; düğüm lisans anahtarıyla kimliklenir.</p>
          )}
          {state?.error && <p className="mt-3 text-[11px] text-destructive">{state.error}</p>}
        </div>
      </div>

      {running && state && state.peers.length > 0 && (
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
