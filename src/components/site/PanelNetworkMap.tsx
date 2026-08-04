import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDeviceOnline, sinceLabel } from "@/components/site/PanelLive";
import { describeNode, useNodeRuntime } from "@/lib/node-runtime";
import { useDiagnostics } from "@/lib/diagnostics";
import { useCarrierBridge } from "@/lib/carrier-bridge";
import { GlobalMeshMap } from "@/components/site/GlobalMeshMap";


type MapDevice = {
  id: string;
  node_id: string;
  label: string | null;
  region: string;
  carrier: string | null;
  role: string | null;
  status: string;
  last_seen_at: string | null;
};

type Sample = {
  created_at: string;
  throughput_kbps: number | null;
  rtt_ms: number | null;
  bytes: number | null;
};

const RING = { gateway: 0, relay: 1, edge: 2 } as const;

function ringOf(d: MapDevice) {
  const id = d.node_id.toLowerCase();
  if (d.role === "gateway" || id.startsWith("ev") || id.startsWith("gw") || id.startsWith("home"))
    return RING.gateway;
  if (d.role === "relay") return RING.relay;
  return RING.edge;
}

/** Canlı mesh topolojisi + gerçek telemetri akış grafiği. Veri yalnızca kayıtlı düğümlerden gelir. */
export function PanelNetworkMap({ devices, refreshKey }: { devices: MapDevice[]; refreshKey: number }) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const runtime = useNodeRuntime();
  const runtimeStatus = describeNode(runtime);
  const diag = useDiagnostics();
  const bridge = useCarrierBridge();

  /** 5 saniyede bir tazeleme + Realtime INSERT aboneliği: metrikler canlı akar. */
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("panel-telemetry")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "telemetry_samples" }, () =>
        setTick((t) => t + 1),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("telemetry_samples")
        .select("created_at,throughput_kbps,rtt_ms,bytes")
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!active) return;
      setSamples((data as Sample[]) ?? []);
      setLastSync(Date.now());
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey, tick]);

  const buckets = useMemo(() => {
    const now = Date.now();
    const slots = Array.from({ length: 12 }, () => ({ kbps: 0, n: 0 }));
    for (const s of samples) {
      const age = now - new Date(s.created_at).getTime();
      const idx = 11 - Math.floor(age / (5 * 60 * 1000));
      if (idx < 0 || idx > 11) continue;
      slots[idx].kbps += s.throughput_kbps ?? 0;
      slots[idx].n += 1;
    }
    return slots.map((s) => (s.n ? s.kbps / s.n : 0));
  }, [samples]);

  const peak = Math.max(1, ...buckets);
  const online = devices.filter((d) => isDeviceOnline(d));
  const rttValues = samples.map((s) => s.rtt_ms).filter((v): v is number => typeof v === "number");
  const dbAvgRtt = rttValues.length ? Math.round(rttValues.reduce((a, b) => a + b, 0) / rttValues.length) : null;
  /** Canlı RTT: tarayıcı düğümünün ping/pong ölçümü öncelikli, yoksa telemetri ortalaması. */
  const liveRtt = diag.rttAvg ?? dbAvgRtt;
  const rttWindow = diag.rttSamples.slice(-40);
  const rttPeak = Math.max(1, ...rttWindow);
  const links = Object.values(bridge.links);
  const liveFrames = links.reduce((a, l) => a + l.frames + (l.rxPackets ?? 0), 0);
  const totalBytes = samples.reduce((a, s) => a + (s.bytes ?? 0), 0);
  const meshLive = runtime.peers.length > 0 || online.length > 0;


  const placed = useMemo(() => {
    const groups: MapDevice[][] = [[], [], []];
    devices.forEach((d) => groups[ringOf(d)].push(d));
    const radii = [0, 92, 158];
    return groups.flatMap((group, ring) =>
      group.map((d, i) => {
        if (ring === 0 && group.length === 1) return { d, x: 200, y: 170, ring };
        const angle = (i / Math.max(1, group.length)) * Math.PI * 2 - Math.PI / 2;
        const r = ring === 0 ? 44 : radii[ring];
        return { d, x: 200 + Math.cos(angle) * r, y: 170 + Math.sin(angle) * r, ring };
      }),
    );
  }, [devices]);

  return (
    <div className="rounded-sm border border-border bg-card/50 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Ağ haritası</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Canlı mesh topolojisi</h2>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.15em]">
          <span
            className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 ${meshLive ? "border-primary/50 text-primary" : "border-border text-muted-foreground"}`}
          >
            <span
              className={`inline-block size-2 rounded-full ${meshLive ? "animate-pulse bg-primary" : "bg-muted-foreground/50"}`}
            />
            {online.length}/{devices.length} çevrimiçi
          </span>
          <span className="rounded-sm border border-border px-3 py-1.5 text-muted-foreground">
            Tarayıcı düğümü · {runtimeStatus.text}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative overflow-hidden rounded-sm border border-border bg-background/70">
          {devices.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Henüz düğüm yok. Bir düğüm telemetri gönderdiğinde harita canlanır.
            </p>
          ) : (
            <svg viewBox="0 0 400 340" className="h-[340px] w-full" role="img" aria-label="Canlı mesh ağ haritası">
              {[92, 158].map((r) => (
                <circle
                  key={r}
                  cx="200"
                  cy="170"
                  r={r}
                  className="fill-none stroke-border"
                  strokeDasharray="3 6"
                  strokeWidth="1"
                />
              ))}
              {placed
                .filter((p) => p.ring !== 0)
                .map((p) => {
                  const live = isDeviceOnline(p.d);
                  return (
                    <g key={`l-${p.d.id}`}>
                      <line
                        x1="200"
                        y1="170"
                        x2={p.x}
                        y2={p.y}
                        className={live ? "stroke-primary/60" : "stroke-border"}
                        strokeWidth={live ? 1.5 : 1}
                        strokeDasharray={live ? undefined : "4 5"}
                      />
                      {live && (
                        <circle r="3" className="fill-primary">
                          <animateMotion
                            dur="2.6s"
                            repeatCount="indefinite"
                            path={`M200,170 L${p.x.toFixed(1)},${p.y.toFixed(1)}`}
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}
              {placed.map((p) => {
                const live = isDeviceOnline(p.d);
                return (
                  <g key={p.d.id}>
                    {live && (
                      <circle cx={p.x} cy={p.y} r="14" className="fill-primary/20">
                        <animate attributeName="r" values="10;20;10" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={p.ring === 0 ? 9 : 6}
                      className={live ? "fill-primary" : "fill-muted stroke-border"}
                      strokeWidth="1"
                    />
                    <text
                      x={p.x}
                      y={p.y + (p.ring === 0 ? 26 : 20)}
                      textAnchor="middle"
                      className="fill-muted-foreground font-mono text-[9px]"
                    >
                      {p.d.node_id}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-sm border border-border bg-background/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Ortalama RTT (canlı)
              </p>
              <span
                className={`flex items-center gap-1.5 font-mono text-[10px] uppercase ${meshLive ? "text-primary" : "text-muted-foreground"}`}
              >
                <span
                  className={`inline-block size-2 rounded-full ${meshLive ? "animate-pulse bg-primary" : "bg-muted-foreground/50"}`}
                />
                {meshLive ? "çevrimiçi" : "beklemede"}
              </span>
            </div>
            <p className="mt-1 font-mono text-lg text-foreground">
              {liveRtt !== null ? `${liveRtt} ms` : "veri yok"}
            </p>
            <div className="mt-3 flex h-12 items-end gap-[2px]" aria-label="Canlı RTT penceresi">
              {rttWindow.length === 0 ? (
                <span className="font-mono text-[10px] text-muted-foreground">ping ölçümü bekleniyor…</span>
              ) : (
                rttWindow.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-primary/70"
                    style={{ height: `${Math.max(4, (v / rttPeak) * 100)}%` }}
                    title={`${v} ms`}
                  />
                ))
              )}
            </div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              p95 {diag.rttP95 ?? "—"} ms · telemetri ort. {dbAvgRtt ?? "—"} ms
            </p>
          </div>
          <Metric
            label="Son 1 saat trafiği"
            value={totalBytes ? `${(totalBytes / 1024).toFixed(1)} KB` : "veri yok"}
            hint={`canlı taşıyıcı çerçevesi ${liveFrames} · bağlı köprü ${links.length}`}
          />
          <Metric
            label="Ölçüm sayısı"
            value={loading ? "yükleniyor…" : `${samples.length}`}
            hint={
              lastSync
                ? `son eşitleme ${new Date(lastSync).toLocaleTimeString("tr-TR")} · 5 sn'de bir`
                : undefined
            }
          />

          <div className="rounded-sm border border-border bg-background/70 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Canlı trafik (5 dk kova · kbps)
            </p>
            <div className="mt-3 flex h-24 items-end gap-1">
              {buckets.map((v, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${v > 0 ? "bg-primary" : "bg-border"}`}
                  style={{ height: `${Math.max(3, (v / peak) * 100)}%` }}
                  title={`${v.toFixed(0)} kbps`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {devices.length > 0 && (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-sm border border-border bg-background/60 px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-[12px] text-foreground">{d.node_id}</span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                  {d.region} · {d.carrier ?? "taşıyıcı yok"}
                </span>
              </span>
              <span
                className={`shrink-0 font-mono text-[10px] uppercase ${
                  isDeviceOnline(d) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isDeviceOnline(d) ? "canlı" : d.last_seen_at ? sinceLabel(d.last_seen_at) : "beklemede"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <GlobalMeshMap devices={devices} />
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/70 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg text-foreground">{value}</p>
      {hint && <p className="mt-1 font-mono text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
