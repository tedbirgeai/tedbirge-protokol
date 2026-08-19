/**
 * CANLI AĞ KOMUT MERKEZİ
 * ------------------------------------------------------------------
 * Dashboard'un dört görsel bölgesi: evrensel ağ telemetrisi, canlı veri
 * taşıma tuvali, adaptör katmanı akış şeması ve ekonomik marj widget'ı.
 * Ek olarak canlı radar (aktif eş sayısı) ve PWA arka plan kurulumu.
 */

import { useMemo } from "react";
import {
  Activity,
  Cloud,
  Cpu,
  Layers,
  Radar,
  Rocket,
  Smartphone,
  TrendingUp,
} from "lucide-react";

import { FREE_PEER_LIMIT } from "@/lib/peer-limit";
import { useNodeRuntime } from "@/lib/node-runtime";
import { promptInstall } from "@/lib/pwa-install";

const OS_MATRIX = [
  { label: "Android", pct: 42, color: "bg-emerald-400" },
  { label: "iOS", pct: 38, color: "bg-cyan-400" },
  { label: "Windows/macOS", pct: 15, color: "bg-sky-500" },
  { label: "IoT/LoRa", pct: 5, color: "bg-amber-400" },
];

function Panel({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 backdrop-blur-sm ${className ?? ""}`}
    >
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-300">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

/** BÖLGE 1 — Evrensel ağ telemetrisi. */
function Telemetry() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Panel title="Aktif Düğüm" icon={<Activity className="h-3.5 w-3.5 text-emerald-400" />}>
        <div className="flex items-baseline gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-mono text-2xl font-extrabold text-emerald-400">18,420</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Active Edge Nodes</p>
      </Panel>

      <Panel title="OS Dağılımı" icon={<Smartphone className="h-3.5 w-3.5 text-cyan-400" />}>
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-800">
          {OS_MATRIX.map((o) => (
            <div key={o.label} className={o.color} style={{ width: `${o.pct}%` }} />
          ))}
        </div>
        <div className="mt-2 space-y-0.5 font-mono text-[10px] text-slate-400">
          {OS_MATRIX.map((o) => (
            <div key={o.label} className="flex justify-between">
              <span>{o.label}</span>
              <span className="text-slate-200">%{o.pct}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Bulutsuz Taşınan Veri" icon={<Cloud className="h-3.5 w-3.5 text-cyan-400" />}>
        <div className="font-mono text-2xl font-extrabold text-cyan-400">1.4 TB</div>
        <p className="mt-1 text-[11px] text-slate-400">Günlük toplam taşınan yük</p>
      </Panel>

      <Panel
        title="Kurtarılan Bulut Faturası"
        icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
      >
        <div className="font-mono text-2xl font-extrabold text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.45)]">
          $42,800
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Aylık AWS/Azure tasarrufu</p>
      </Panel>
    </div>
  );
}

/** BÖLGE 2 — Canlı veri taşıma tüneli. */
function TransitCanvas() {
  return (
    <Panel title="Canlı Veri Taşıma Tuvali" icon={<Activity className="h-3.5 w-3.5 text-emerald-400" />}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center">
          <Smartphone className="mx-auto h-4 w-4 text-emerald-400" />
          <span className="mt-1 block font-mono text-[10px] text-emerald-300">Android Node A</span>
        </div>

        <div className="relative h-8 flex-1 overflow-hidden rounded-full border border-slate-800 bg-slate-950">
          <div className="absolute inset-y-1/2 h-px w-full bg-gradient-to-r from-emerald-500/40 via-cyan-400/60 to-emerald-500/40" />
          <span className="absolute top-1/2 -translate-y-1/2 animate-[tbos-tunnel_2.4s_linear_infinite] rounded bg-cyan-400/20 px-1.5 py-0.5 font-mono text-[9px] text-cyan-200">
            .tpack
          </span>
        </div>

        <div className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-center">
          <Smartphone className="mx-auto h-4 w-4 text-cyan-400" />
          <span className="mt-1 block font-mono text-[10px] text-cyan-300">iOS Node B</span>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 border-t border-slate-800 pt-2 font-mono text-[10px] text-slate-400 sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt>Kaynak</dt>
          <dd className="text-slate-200">Yerel SQLite / Medya / Metin</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Taşıma yolu</dt>
          <dd className="text-cyan-300">P2P / WebRTC Direct (bulut yok)</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Şifreleme</dt>
          <dd className="text-emerald-400">E2EE · AES-GCM-256</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Gecikme</dt>
          <dd className="text-emerald-400">4 ms</dd>
        </div>
      </dl>
    </Panel>
  );
}

/** BÖLGE 3 — Adaptör katmanı akış şeması. */
function AdapterPipeline() {
  const steps = [
    { title: "Uygulama Ekranı", note: "WhatsApp / ERP / Dosya", icon: Layers },
    { title: "Tedbirge OS Adaptörü", note: "Veriyi soyutlar & paketler", icon: Cpu },
    { title: "Transport Substrate", note: "OS bağımsız düğümlere dağıtır", icon: Radar },
  ];
  return (
    <Panel title="Adaptör Katmanı Mimarisi" icon={<Layers className="h-3.5 w-3.5 text-cyan-400" />}>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s.title}>
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-2">
              <s.icon className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-200">{s.title}</p>
                <p className="truncate font-mono text-[10px] text-slate-500">{s.note}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="ml-4 h-2 w-px bg-emerald-500/50" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/** BÖLGE 4 — Ekonomik marj. */
function MarginWidget() {
  const bars = [
    { label: "Geleneksel bulut", pct: 100, color: "bg-slate-600", value: "$46.8K" },
    { label: "Tedbirge sabit altyapı", pct: 9, color: "bg-emerald-400", value: "$4.0K" },
  ];
  return (
    <Panel title="Ekonomik Marj" icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}>
      <div className="space-y-2.5">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex justify-between font-mono text-[10px] text-slate-400">
              <span>{b.label}</span>
              <span className="text-slate-200">{b.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-center font-mono text-[11px] font-bold text-emerald-400">
        Brüt Kâr Marjı: %91.4
      </p>
    </Panel>
  );
}

/** Canlı radar: aktif eş sayısı ve ücretsiz katman doluluğu. */
function LiveRadar() {
  const state = useNodeRuntime();
  const active = useMemo(() => state.peers.filter((p) => p.direct).length, [state.peers]);
  const full = active >= FREE_PEER_LIMIT;

  return (
    <Panel title="Canlı Radar / Düğüm Taraması" icon={<Radar className="h-3.5 w-3.5 text-cyan-400" />}>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full border border-cyan-400/50" />
          <span className="absolute inset-2 animate-pulse rounded-full border border-emerald-400/60" />
          <span className="absolute inset-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
        </div>
        <div className="min-w-0">
          <p
            className={`font-mono text-lg font-bold ${full ? "text-amber-400" : "text-emerald-400"}`}
          >
            {active}/{FREE_PEER_LIMIT} {full ? "MAX FREE" : "Active Nodes"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {state.running ? "Wasm çekirdek çalışıyor · eş taraması aktif" : "Düğüm başlatılıyor…"}
          </p>
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            <Rocket className="h-3.5 w-3.5" /> Ağı Arka Planda 7/24 Çalıştır
          </button>
        </div>
      </div>
    </Panel>
  );
}

export function CommandCenter() {
  return (
    <section className="space-y-2">
      <Telemetry />
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <TransitCanvas />
        </div>
        <div className="xl:col-span-3">
          <AdapterPipeline />
        </div>
        <div className="space-y-2 xl:col-span-3">
          <LiveRadar />
          <MarginWidget />
        </div>
      </div>
    </section>
  );
}
