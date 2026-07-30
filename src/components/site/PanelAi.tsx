import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildInsights, type Insight, type InsightDevice, type InsightSample } from "@/lib/network-insights";

const TONE: Record<Insight["severity"], { chip: string; border: string; label: string }> = {
  critical: { chip: "text-destructive", border: "border-destructive/50", label: "kritik" },
  warning: { chip: "text-amber-400", border: "border-amber-400/50", label: "uyarı" },
  info: { chip: "text-primary", border: "border-primary/40", label: "öneri" },
};

export function openAdvisor(prefill?: string) {
  window.dispatchEvent(new CustomEvent("tedbirge:advisor", { detail: { prefill } }));
}

/** Ağ telemetrisiyle beslenen proaktif yapay zeka paneli. */
export function PanelAi({ devices, refreshKey }: { devices: InsightDevice[]; refreshKey: number }) {
  const [samples, setSamples] = useState<InsightSample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("telemetry_samples")
        .select("device_id,rtt_ms,packet_loss_pct,throughput_kbps")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(600);
      if (!active) return;
      setSamples((data as InsightSample[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const insights = useMemo(() => buildInsights(devices, samples), [devices, samples]);
  const critical = insights.filter((i) => i.severity === "critical").length;
  const warnings = insights.filter((i) => i.severity === "warning").length;

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-border bg-card/50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Yapay zeka</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Proaktif ağ danışmanı</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Danışman, kayıtlı düğümlerinizin telemetrisini (gecikme, paket kaybı, verim, hata kodları)
              sürekli değerlendirir; sorun büyümeden önce sebebini ve çözüm adımını gösterir.
            </p>
          </div>
          <button
            onClick={() => openAdvisor("Ağımın son durumunu değerlendirir misin?")}
            className="rounded-sm bg-primary px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            Danışmanı aç
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Kritik bulgu" value={String(critical)} tone={critical ? "text-destructive" : "text-primary"} />
          <Stat label="Uyarı" value={String(warnings)} tone={warnings ? "text-amber-400" : "text-primary"} />
          <Stat label="Değerlendirilen ölçüm" value={loading ? "…" : String(samples.length)} tone="text-foreground" />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Telemetri okunuyor…</p>
        ) : insights.length === 0 ? (
          <div className="rounded-sm border border-primary/40 bg-primary/5 p-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Durum</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ağınızda bulgu yok. Tüm düğümler beklenen sınırlar içinde çalışıyor.
            </p>
          </div>
        ) : (
          insights.map((i) => {
            const tone = TONE[i.severity];
            return (
              <article key={i.id} className={`rounded-sm border ${tone.border} bg-card/50 p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{i.title}</p>
                  <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${tone.chip}`}>
                    {tone.label}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.detail}</p>
                <p className="mt-3 rounded-sm border border-border bg-background/60 p-3 text-sm text-foreground">
                  <strong className="font-semibold">Öneri:</strong> {i.action}
                </p>
                <button
                  onClick={() => openAdvisor(i.ask)}
                  className="mt-3 rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
                >
                  Danışmana sor
                </button>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-2xl ${tone}`}>{value}</p>
    </div>
  );
}
