import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/saha-raporu")({
  head: () => ({
    meta: [
      { title: "Saha Test Raporu — Tedbirge Protokol Ölçümleri" },
      {
        name: "description",
        content:
          "Sahadaki Tedbirge Protokol düğümlerinden gelen RTT, throughput ve paket kaybı ölçümlerini görün, yazdırılabilir saha test raporu üretin.",
      },
      { property: "og:title", content: "Tedbirge Saha Test Raporu" },
      { property: "og:description", content: "Düğüm bazlı gecikme, hız ve paket kaybı ölçümleri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SahaRaporu,
});

type Device = {
  id: string;
  node_id: string;
  label: string | null;
  region: string;
  carrier: string | null;
  firmware: string | null;
  status: string;
  last_seen_at: string | null;
};

type Sample = {
  id: string;
  device_id: string;
  carrier: string | null;
  rtt_ms: number | null;
  throughput_kbps: number | null;
  packet_loss_pct: number | null;
  hops: number | null;
  bytes: number | null;
  created_at: string;
};

function avg(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function fmt(n: number | null, unit: string, digits = 1) {
  if (n === null || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)} ${unit}`;
}

function SahaRaporu() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: d }, { data: s }] = await Promise.all([
        supabase.from("devices").select("*").order("created_at", { ascending: true }),
        supabase
          .from("telemetry_samples")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      if (!active) return;
      setDevices((d as Device[]) ?? []);
      setSamples((s as Sample[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const totals = useMemo(() => {
    const rtt = samples.map((s) => s.rtt_ms).filter((v): v is number => v !== null);
    const thr = samples.map((s) => s.throughput_kbps).filter((v): v is number => v !== null);
    const loss = samples.map((s) => s.packet_loss_pct).filter((v): v is number => v !== null);
    const bytes = samples.reduce((a, s) => a + (s.bytes ?? 0), 0);
    return { rtt: avg(rtt), thr: avg(thr), loss: avg(loss), bytes, count: samples.length };
  }, [samples]);

  const perDevice = useMemo(
    () =>
      devices.map((d) => {
        const own = samples.filter((s) => s.device_id === d.id);
        return {
          device: d,
          count: own.length,
          rtt: avg(own.map((s) => s.rtt_ms).filter((v): v is number => v !== null)),
          thr: avg(own.map((s) => s.throughput_kbps).filter((v): v is number => v !== null)),
          loss: avg(own.map((s) => s.packet_loss_pct).filter((v): v is number => v !== null)),
          last: own[0]?.created_at ?? d.last_seen_at,
        };
      }),
    [devices, samples],
  );

  function downloadCsv() {
    const header = "zaman,dugum,tasiyici,rtt_ms,throughput_kbps,paket_kaybi_pct,hop,bayt\n";
    const map = new Map(devices.map((d) => [d.id, d.node_id]));
    const rows = samples
      .map((s) =>
        [
          s.created_at,
          map.get(s.device_id) ?? s.device_id,
          s.carrier ?? "",
          s.rtt_ms ?? "",
          s.throughput_kbps ?? "",
          s.packet_loss_pct ?? "",
          s.hops ?? "",
          s.bytes ?? "",
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tedbirge-saha-raporu-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SitePage>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionLabel>Saha test raporu</SectionLabel>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Ölçüm ve kanıt özeti</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Sahadaki düğümler <span className="font-mono text-foreground">/api/public/telemetry</span>{" "}
          uç noktasına ölçüm gönderdikçe bu rapor otomatik dolar. Rapor yalnızca metrik taşır;
          tünel içeriği hiçbir zaman iletilmez.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-sm bg-primary px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            PDF olarak yazdır
          </button>
          <button
            onClick={downloadCsv}
            className="rounded-sm border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
          >
            CSV indir
          </button>
          <Link
            to="/api-dokumantasyon"
            className="rounded-sm border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Telemetri API'si
          </Link>
          <Link
            to="/pilot-panosu"
            className="rounded-sm border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Pilot uyum panosu
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-4">
          <Metric label="ortalama RTT" value={fmt(totals.rtt, "ms")} />
          <Metric label="ortalama hız" value={fmt(totals.thr, "kbps", 0)} />
          <Metric label="paket kaybı" value={fmt(totals.loss, "%", 2)} />
          <Metric label="ölçüm sayısı" value={String(totals.count)} />
        </div>

        <div className="mt-10 overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card/60 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Düğüm</th>
                <th className="px-4 py-3">Bölge / taşıyıcı</th>
                <th className="px-4 py-3">RTT</th>
                <th className="px-4 py-3">Hız</th>
                <th className="px-4 py-3">Kayıp</th>
                <th className="px-4 py-3">Son ölçüm</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                    Yükleniyor…
                  </td>
                </tr>
              ) : perDevice.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                    Henüz kayıtlı düğüm yok. Düğümü lisans anahtarınızla telemetri uç noktasına
                    bağladığınızda burada listelenir.
                  </td>
                </tr>
              ) : (
                perDevice.map((r) => (
                  <tr key={r.device.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-mono text-[12px]">
                      {r.device.node_id}
                      {r.device.label ? (
                        <span className="block text-[11px] text-muted-foreground">
                          {r.device.label}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">
                      {r.device.region} · {r.device.carrier ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">{fmt(r.rtt, "ms")}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{fmt(r.thr, "kbps", 0)}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{fmt(r.loss, "%", 2)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {r.last ? new Date(r.last).toLocaleString("tr-TR") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-10 rounded-sm border border-border bg-card/40 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Son ölçümler
          </p>
          <ul className="mt-4 space-y-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {samples.slice(0, 12).map((s) => (
              <li key={s.id}>
                [{new Date(s.created_at).toLocaleString("tr-TR")}] {s.carrier ?? "—"} · rtt{" "}
                {s.rtt_ms ?? "—"} ms · hız {s.throughput_kbps ?? "—"} kbps · kayıp{" "}
                {s.packet_loss_pct ?? "—"}% · hop {s.hops ?? "—"}
              </li>
            ))}
            {samples.length === 0 && <li>ölçüm bekleniyor…</li>}
          </ul>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Rapor sahibi: Mehmet DİNÇ (Tedbirge Protokol). Ölçümler yalnızca operatörün kendi
          lisansına bağlı düğümlerinden gelir; TR profilinde 868 MHz / 25 mW e.r.p. / %1 görev
          döngüsü sınırları düğüm tarafında zorlanır.
        </p>
      </section>
    </SitePage>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/80 px-5 py-4">
      <p className="font-mono text-sm text-primary">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
