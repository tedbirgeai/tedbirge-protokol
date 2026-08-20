import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

import {
  Activity,
  ArrowDown,
  ArrowUp,
  Box,
  ChartLine,
  CircleUser,
  Clock,
  Cpu,
  Expand,
  Folder,
  FolderOpen,
  FolderTree,
  Gauge,
  Globe,
  LayoutDashboard,
  Network,
  QrCode,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  TerminalSquare,
} from "lucide-react";

import { CommandCenter } from "@/components/shell/CommandCenter";
import { PaywallModal } from "@/components/shell/PaywallModal";
import { NodeTestModal } from "@/components/shell/NodeTestModal";
import { KERNEL_LOG_EVENT, type KernelLogDetail } from "@/lib/peer-limit";

type LogLine = { time: string; text: string; tone?: "warn" };

const NODES = [
  { label: "NODE_BF3A", latency: "45 ms", dist: 120, angle: 0 },
  { label: "NODE_C1D2", latency: "18 ms", dist: 140, angle: 45 },
  { label: "NODE_789E", latency: "22 ms", dist: 160, angle: 85 },
  { label: "NODE_4A7D", latency: "31 ms", dist: 130, angle: 130 },
  { label: "NODE_2E9C", latency: "16 ms", dist: 150, angle: 170 },
  { label: "NODE_9F3B", latency: "27 ms", dist: 120, angle: 215 },
  { label: "NODE_03A1", latency: "33 ms", dist: 155, angle: 260 },
  { label: "NODE_6C8E", latency: "20 ms", dist: 140, angle: 300 },
  { label: "NODE_A7B2", latency: "28 ms", dist: 165, angle: 335 },
];

const SIM_LOGS = [
  "[BİLGİ] Ping tazelendi: 18ms",
  "[GÜVENLİK] ZK-proof doğrulaması başarılı",
  "[DURUM] Bant genişliği kararlı: 85.7 Mbps",
  "[BİLGİ] Yeni paket yönlendirildi -> Frankfurt",
  "[DURUM] Mesh rotaları güncellendi",
];

/** Canvas tabanlı canlı P2P mesh topolojisi (yalnızca görselleştirme). */
function MeshCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nodes = NODES.map((n) => ({ ...n, x: 0, y: 0 }));
    const particles = Array.from({ length: 15 }, () => ({
      nodeIndex: Math.floor(Math.random() * nodes.length),
      progress: Math.random(),
      speed: 0.005 + Math.random() * 0.008,
    }));

    let pulseRadius = 0;
    let raf = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      pulseRadius = (pulseRadius + 0.6) % 180;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16, 185, 129, ${1 - pulseRadius / 180})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      nodes.forEach((node) => {
        const rad = (node.angle * Math.PI) / 180;
        node.x = cx + Math.cos(rad) * node.dist;
        node.y = cy + Math.sin(rad) * node.dist;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#06b6d4";
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + 16);
        ctx.fillStyle = "#10b981";
        ctx.fillText(node.latency, node.x, node.y + 27);
      });

      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) {
          p.progress = 0;
          p.nodeIndex = Math.floor(Math.random() * nodes.length);
        }
        const target = nodes[p.nodeIndex];
        const px = cx + (target.x - cx) * p.progress;
        const py = cy + (target.y - cy) * p.progress;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#00ff9d";
        ctx.shadowColor = "#00ff9d";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = "#091512";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 9px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = "#10b981";
      ctx.textAlign = "center";
      ctx.fillText("THIS_NODE", cx, cy + 3);

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="block h-full w-full" />;
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{k}</span>
      <span className={tone ?? "text-slate-200"}>{v}</span>
    </div>
  );
}

function Card({
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
    <div className={`rounded-lg border border-slate-800/80 bg-[#0b101d] p-3 ${className ?? ""}`}>
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-slate-300">
        {icon}
        <span>{title}</span>
      </div>
      <div className="pt-2">{children}</div>
    </div>
  );
}

/** Tedbirge Protocol P2P Web-OS kontrol paneli. */
export default function Dashboard() {
  const [logs, setLogs] = useState<LogLine[]>([
    { time: "14:32:18", text: "[DURUM] Dijkstra rotası hesaplandı" },
    { time: "14:32:18", text: "[BİLGİ] Eşleşme el sıkışması tamam" },
    { time: "14:32:19", text: "[GÜVENLİK] AES-256-GCM Şifreleme Aktif" },
    { time: "14:32:20", text: "[DURUM] Düğüm doğrulaması başarılı" },
    { time: "14:32:20", text: "[BİLGİ] Topoloji güncellendi" },
    { time: "14:32:21", text: "[DURUM] Yeni eş bağlandı: NODE_789E" },
    { time: "14:32:22", text: "[DURUM] Bant genişliği ölçümü tamam" },
  ]);
  const [command, setCommand] = useState("");
  const [nodeTestOpen, setNodeTestOpen] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      const time = now.toLocaleTimeString("tr-TR", { hour12: false });
      const text = SIM_LOGS[Math.floor(Math.random() * SIM_LOGS.length)];
      setLogs((prev) => [...prev.slice(-60), { time, text }]);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  // Çekirdek katmanı uyarıları (ör. ücretsiz eş limiti) canlı akışa düşer.
  useEffect(() => {
    const onKernelLog = (event: Event) => {
      const detail = (event as CustomEvent<KernelLogDetail>).detail;
      if (!detail?.text) return;
      setLogs((prev) => [
        ...prev.slice(-60),
        {
          time: new Date().toLocaleTimeString("tr-TR", { hour12: false }),
          text: detail.text,
          ...(detail.tone === "warn" ? { tone: "warn" as const } : {}),
        },
      ]);
    };
    window.addEventListener(KERNEL_LOG_EVENT, onKernelLog);
    return () => window.removeEventListener(KERNEL_LOG_EVENT, onKernelLog);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const runCommand = () => {
    const cmd = command.trim();
    if (!cmd) return;
    setLogs((prev) => [
      ...prev.slice(-60),
      { time: new Date().toLocaleTimeString("tr-TR", { hour12: false }), text: `[KOMUT] ${cmd}` },
    ]);
    setCommand("");
  };

  return (
    <div className="flex h-[100dvh] w-full select-none flex-col overflow-hidden bg-[#06090e] text-slate-400">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#0b101d] px-3 py-2 text-[11px] sm:gap-3 sm:px-4 sm:py-2.5 sm:text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-bold tracking-wide text-emerald-400">
            <Box className="h-4 w-4 text-cyan-400" />
            <span>tedbirge-protokol</span>
            <span className="rounded border border-emerald-500/30 bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
              v2.7.1
            </span>
          </div>
          <span className="hidden text-slate-600 sm:inline">|</span>
          <span className="hidden font-mono text-slate-400 md:inline">
            tedbirgeai/tedbirge-protokol/src
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900/80 px-2.5 py-1">
            <span className="text-[11px] text-slate-400">SİSTEM DURUMU:</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> start.ts
              ÇEVRİMİÇİ
            </span>
            <span className="ml-2 inline-flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> server.ts
              ÇEVRİMİÇİ
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 font-mono text-emerald-400">
            <Shield className="h-3.5 w-3.5" />
            <span>GÜVENLİ (AES-256-GCM)</span>
          </div>
          <div className="hidden items-center gap-2 text-slate-400 lg:flex">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>
              ÇALIŞMA SÜRESİ: <strong className="font-mono text-slate-200">12g 6sa 24dk</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setNodeTestOpen(true)}
            className="flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20"
          >
            <QrCode className="h-3.5 w-3.5" /> Interactive Node Test
          </button>
          <div className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-200">
            <CircleUser className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono">node_admin</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        <aside className="hidden w-56 flex-col justify-between rounded-lg border border-slate-800/80 bg-[#0b101d] p-3 text-xs lg:flex">
          <div>
            <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Gezinme
            </div>
            <nav className="space-y-1 font-mono">
              <span className="flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 font-medium text-emerald-400">
                <FolderOpen className="h-3.5 w-3.5" /> routes/
              </span>
              {["kernel/", "components/", "wasm/"].map((f) => (
                <span
                  key={f}
                  className="flex items-center gap-2 rounded px-2.5 py-1.5 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                >
                  <Folder className="h-3.5 w-3.5" /> {f}
                </span>
              ))}
            </nav>

            <div className="mb-2 mt-5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sistem
            </div>
            <nav className="space-y-1">
              <Link
                to="/panel"
                className="flex items-center gap-2 rounded px-2.5 py-1.5 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-cyan-400" /> Kontrol Paneli
              </Link>
              <span className="flex items-center gap-2 rounded border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-1.5 font-medium text-emerald-400">
                <Share2 className="h-3.5 w-3.5" /> Ağ Topolojisi
              </span>
              <button
                type="button"
                onClick={() =>
                  logRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <TerminalSquare className="h-3.5 w-3.5 text-cyan-400" /> Terminal Logları
              </button>
              <Link
                to="/system"
                className="flex items-center gap-2 rounded px-2.5 py-1.5 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <FolderTree className="h-3.5 w-3.5 text-cyan-400" /> Dosya Yöneticisi
              </Link>
              <Link
                to="/guvenlik"
                className="flex items-center gap-2 rounded px-2.5 py-1.5 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Güvenlik &amp; ZK
              </Link>
              <Link
                to="/app"
                className="flex items-center gap-2 rounded px-2.5 py-1.5 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <Settings className="h-3.5 w-3.5 text-cyan-400" /> Uygulama &amp; Ayarlar
              </Link>
            </nav>
          </div>

          <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">P2P AĞ DURUMU</span>
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" /> BAĞLI
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              DÜĞÜM KİMLİĞİ: <span className="text-slate-200">THIS_NODE</span>
            </div>
            <div className="text-[10px] text-slate-400">
              ROL: <span className="font-bold text-cyan-400">SÜPER EŞ</span>
            </div>
            <div className="text-[10px] text-slate-400">
              SÜRÜM: <span className="text-slate-200">v2.7.1</span>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto">
          <CommandCenter />
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-2 xl:overflow-y-auto xl:col-span-3">
              <Card title="AĞ ÖZETİ" icon={<Globe className="h-3.5 w-3.5 text-emerald-400" />}>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-3xl font-extrabold text-emerald-400">823</span>
                  <span className="text-xs font-medium text-slate-400">AKTİF DÜĞÜM</span>
                </div>
                <div className="mt-2 space-y-1 border-t border-slate-800/60 pt-2 font-mono text-xs text-slate-400">
                  <Row k="TOPLAM DÜĞÜM:" v="1,284" />
                  <Row k="AKTİF BAĞLANTI:" v="823" tone="text-emerald-400" />
                  <Row k="ÇALIŞMA SÜRESİ:" v="12g 6sa" />
                  <Row k="PROTOKOL:" v="P2P v2.7.1" tone="text-cyan-400" />
                </div>
              </Card>

              <Card title="WASM KUM HAVUZU" icon={<Cpu className="h-3.5 w-3.5 text-cyan-400" />}>
                <div className="space-y-1.5 font-mono text-xs text-slate-400">
                  <Row k="BELLEK KULLANIMI:" v="64.2 MB" />
                  <Row k="YIĞIN (HEAP):" v="42.7 MB" />
                  <Row k="STACK:" v="9.8 MB" />
                  <div className="flex items-center justify-between pt-1">
                    <span>DURUM:</span>
                    <span className="rounded border border-emerald-500/30 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      KARARLI
                    </span>
                  </div>
                </div>
              </Card>

              <Card
                title="P2P BANT GENİŞLİĞİ"
                icon={<Gauge className="h-3.5 w-3.5 text-emerald-400" />}
                className="flex-1"
              >
                <div className="space-y-3 font-mono">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>YÜKLEME:</span>
                      <span className="font-bold text-emerald-400">↑ 85.7 Mbps</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full w-[85%] rounded-full bg-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>İNDİRME:</span>
                      <span className="font-bold text-cyan-400">↓ 32.4 Mbps</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full w-[35%] rounded-full bg-cyan-400" />
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2 text-xs text-slate-400">
                    <span>AKTARILAN VERİ:</span>
                    <span className="text-slate-200">2.54 TB</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="relative flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-slate-800/80 bg-[#0b101d] p-3 xl:col-span-6">
              <div className="z-10 mb-2 flex items-center justify-between text-xs font-bold text-slate-200">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>P2P AĞ TOPOLOJİSİ</span>
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                    CANLI
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Expand className="h-3.5 w-3.5" />
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="relative h-full w-full flex-1 overflow-hidden rounded border border-slate-900 bg-[#070b13]">
                <MeshCanvas />
                <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 font-mono text-[10px] text-slate-400 backdrop-blur-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-2.5 bg-emerald-400" /> DOĞRUDAN BAĞLANTI
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-2.5 bg-cyan-400" /> 1 ATLAYIŞ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-2.5 bg-slate-500" /> 2+ ATLAYIŞ
                  </span>
                  <span className="ml-2 font-bold text-emerald-400">ALGORİTMA: DIJKSTRA</span>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2 xl:overflow-y-auto xl:col-span-3">
              <Card
                title="AĞ METRİKLERİ"
                icon={<ChartLine className="h-3.5 w-3.5 text-cyan-400" />}
              >
                <div className="space-y-2 font-mono text-xs text-slate-400">
                  <Row k="İLETİLEN PAKETLER:" v="1.24M" />
                  <Row k="HESAPLANAN ROTALAR:" v="5.38K" />
                  <Row k="ORTALAMA GECİKME:" v="24.7 ms" tone="text-emerald-400" />
                  <Row k="PAKET KAYBI:" v="%0.12" tone="text-emerald-400" />
                  <Row k="BANT GENİŞLİĞİ PUANI:" v="98.7 / 100" tone="text-cyan-400" />
                  <div className="flex items-center justify-between border-t border-slate-800 pt-1">
                    <span>AĞ SAĞLIĞI:</span>
                    <span className="font-bold tracking-wider text-emerald-400">MÜKEMMEL</span>
                  </div>
                </div>
              </Card>

              <div className="flex min-h-[220px] flex-1 flex-col rounded-lg border border-slate-800/80 bg-[#0b101d] p-3">
                <div className="mb-2 flex items-center gap-2 border-b border-slate-800 pb-2 font-mono text-xs font-bold text-slate-300">
                  <TerminalSquare className="h-3.5 w-3.5 text-emerald-400" /> P2P TERMINAL
                </div>
                <div
                  ref={logRef}
                  className="flex-1 space-y-1.5 overflow-y-auto pr-1 font-mono text-[11px] text-slate-300"
                >
                  {logs.map((l, i) => (
                    <div key={i}>
                      <span className="text-slate-500">{l.time}</span>{" "}
                      <span
                        className={
                          l.tone === "warn"
                            ? "text-amber-400"
                            : l.text.startsWith("[GÜVENLİK]")
                              ? "text-emerald-400"
                              : "text-cyan-400"
                        }
                      >
                        {l.text}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-slate-800 pt-2 font-mono text-xs">
                  <span className="whitespace-nowrap text-emerald-400">p2p@this_node:~$</span>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runCommand()}
                    placeholder="Komut yazın (örn: build, status)..."
                    className="w-full bg-transparent text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-[#0b101d] p-2.5 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Network className="h-3.5 w-3.5 text-cyan-400" />
                <span>
                  AĞ: <strong className="text-emerald-400">CANLI</strong>
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-slate-400">
                  <ArrowUp className="h-3 w-3 text-emerald-400" /> YÜKLEME:{" "}
                  <strong className="text-slate-200">85.7 Mbps</strong>
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <ArrowDown className="h-3 w-3 text-cyan-400" /> İNDİRME:{" "}
                  <strong className="text-slate-200">32.4 Mbps</strong>
                </span>
              </div>
              <div className="hidden items-center gap-3 border-l border-slate-800 pl-6 lg:flex">
                <span className="text-slate-400">
                  SİSTEM YÜKÜ: <strong className="text-emerald-400">NORMAL</strong>
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span>CPU:</span>
                  <div className="h-1.5 w-16 rounded bg-slate-800">
                    <div className="h-full w-[23%] rounded bg-emerald-400" />
                  </div>
                  <span className="text-slate-200">23%</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span>RAM:</span>
                  <div className="h-1.5 w-16 rounded bg-slate-800">
                    <div className="h-full w-[41%] rounded bg-cyan-400" />
                  </div>
                  <span className="text-slate-200">41%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="hidden items-center gap-2 border-r border-slate-800 pr-6 lg:flex">
                <span className="text-slate-400">
                  DİSK G/Ç: <strong className="text-slate-200">48%</strong>
                </span>
                <span className="text-[10px] text-slate-500">
                  OKUMA: 248 MB/s | YAZMA: 182 MB/s
                </span>
              </div>
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>GÜVENLİ BAĞLANTI (AES-256-GCM)</span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      <NodeTestModal open={nodeTestOpen} onClose={() => setNodeTestOpen(false)} />
      <PaywallModal />
    </div>
  );
}
