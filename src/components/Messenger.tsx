/**
 * TEDBIRGE WEB-OS — P2P MESSENGER & VIDEO
 * ------------------------------------------------------------------
 * Duyarlı (masaüstü / tablet / mobil) Web-OS kabuğu: sol gezinme,
 * ağ özeti + canlı canvas topolojisi, P2P video ızgarası ve uçtan uca
 * şifreli mesajlaşma sütunu. Düğüm bileşen yüklendiğinde arka planda
 * otomatik ateşlenir; kullanıcı hiçbir butona basmaz.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Box,
  CircleUser,
  Clock,
  Folder,
  FolderOpen,
  FolderTree,
  Globe,
  LayoutDashboard,
  Lock,
  Mic,
  MonitorUp,
  MoreHorizontal,
  Network,
  Paperclip,
  PhoneOff,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  TerminalSquare,
  Users,
  Video,
} from "lucide-react";

import { useNodeRuntime } from "@/lib/node-runtime";
import {
  broadcastText,
  ensureLiveNode,
  measureRoute,
  nodeLabel,
  toLivePeers,
  onLiveMessage,
  type LiveMessage,
  type LivePeer,
} from "@/services/signaling";

type Participant = { id: string; name: string; handle: string; active?: boolean; self?: boolean };

/**
 * Yerel medya: izin verilmezse arayüz çökmez, cihaz "Sadece Veri Düğümü"
 * olarak ağda kalmaya devam eder.
 */
function useLocalMedia() {
  const [mode, setMode] = useState<"pending" | "av" | "audio" | "data">("pending");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    const stop = () => stream?.getTracks().forEach((t) => t.stop());

    const run = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setMode("data");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (!cancelled) setMode("av");
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!cancelled) setMode("audio");
        } catch {
          if (!cancelled) setMode("data");
        }
      }
      stop();
    };
    void run();
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return mode;
}

/** Mini mesh topolojisi — yeniden boyutlandırmaya duyarlı canvas döngüsü. */
function MiniMeshCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nodes = [
      { x: 0.2, y: 0.28, r: 4.5, label: "NODE_83A1" },
      { x: 0.8, y: 0.2, r: 4.5, label: "NODE_6C8E" },
      { x: 0.86, y: 0.7, r: 4.5, label: "NODE_789E" },
      { x: 0.3, y: 0.82, r: 4.5, label: "NODE_1F2B" },
      { x: 0.14, y: 0.62, r: 4.5, label: "NODE_44C0" },
    ];
    // Her kenarda dolaşan veri paketi (0–1 arası ilerleme).
    const packets = nodes.map((_, i) => ({ t: i * 0.17, speed: 0.004 + (i % 3) * 0.0018 }));

    let raf = 0;
    let pulse = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(parent.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(parent.clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;
      pulse = (pulse + 0.35) % Math.max(24, Math.min(w, h) / 2);

      // Merkez nabız halkası
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16, 185, 129, ${Math.max(0, 0.35 - pulse / 200)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      nodes.forEach((n, i) => {
        const nx = w * n.x;
        const ny = h * n.y;

        // Bağlantı çizgisi
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.28)";
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // Hareketli veri paketi
        const p = packets[i]!;
        p.t = (p.t + p.speed) % 1;
        const px = cx + (nx - cx) * p.t;
        const py = cy + (ny - cy) * p.t;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#22d3ee";
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Çevre düğüm (cyan glow)
        ctx.beginPath();
        ctx.arc(nx, ny, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "#06b6d4";
        ctx.shadowColor = "rgba(6,182,212,0.9)";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (w > 200) {
          ctx.font = "8px ui-monospace, monospace";
          ctx.fillStyle = "rgba(148,163,184,0.75)";
          ctx.textAlign = nx > cx ? "right" : "left";
          ctx.fillText(n.label, nx + (nx > cx ? -8 : 8), ny - 8);
        }
      });

      // Merkez THIS_NODE (emerald glow)
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fillStyle = "#091512";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(16,185,129,0.9)";
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (w > 200) {
        ctx.font = "8px ui-monospace, monospace";
        ctx.fillStyle = "rgba(16,185,129,0.9)";
        ctx.textAlign = "center";
        ctx.fillText("THIS_NODE", cx, cy + 24);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas id="meshTopologyCanvas" ref={ref} className="block h-full w-full bg-transparent" />;
}


function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-slate-800/80 bg-[#0b101d] p-3 ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

function PanelTitle({
  icon,
  children,
  right,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-slate-300">
      <span className="flex min-w-0 items-center gap-2 truncate">
        {icon}
        <span className="truncate">{children}</span>
      </span>
      {right}
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{k}</span>
      <span className={tone ?? "text-slate-200"}>{v}</span>
    </div>
  );
}

function WaveBars({ delayed }: { delayed?: boolean }) {
  const bars = [0.1, 0.3, 0.5];
  return (
    <span className="flex items-end gap-0.5 text-emerald-400">
      {bars.map((d) => (
        <span
          key={d}
          className="w-1 rounded bg-emerald-400"
          style={{
            height: delayed ? 12 : 10,
            animation: "tbg-wave 1.2s infinite ease-in-out",
            animationDelay: `${d}s`,
          }}
        />
      ))}
    </span>
  );
}

function VideoTile({ p }: { p: Participant }) {
  return (
    <div
      className={`relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-lg border p-2 sm:min-h-[160px] ${
        p.active
          ? "border-emerald-500 bg-slate-900/90 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
          : "border-slate-800 bg-slate-900/90"
      }`}
    >
      {p.active ? (
        <span className="absolute left-2 top-2 rounded border border-emerald-500/30 bg-emerald-950/80 px-1.5 py-0.5 font-osmono text-[9px] text-emerald-400">
          AKTİF KONUŞMACI
        </span>
      ) : null}

      <div className="my-2 flex flex-1 items-center justify-center">
        <span
          className={`grid h-16 w-16 place-items-center rounded-full border-2 font-osmono text-sm font-bold ${
            p.self
              ? "border-emerald-400/60 bg-emerald-950/50 text-emerald-400"
              : "border-cyan-500/40 bg-slate-950 text-cyan-300"
          }`}
        >
          {p.self ? <Box className="h-6 w-6 text-emerald-400" /> : <Network className="h-6 w-6" />}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 font-osmono text-[11px]">
        <div className="min-w-0">
          <div className="truncate font-bold text-slate-200">{p.name}</div>
          <div className="truncate text-[9px] text-slate-500">{p.handle}</div>
        </div>
        {p.active || p.self ? (
          <WaveBars delayed={p.self} />
        ) : (
          <Mic className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
        )}
      </div>
    </div>
  );
}

/** Tedbirge Web-OS P2P Messenger & Video kabuğu. */
export default function Messenger() {
  const node = useNodeRuntime();
  const media = useLocalMedia();
  const [draft, setDraft] = useState("");
  const [feed, setFeed] = useState<LiveMessage[]>([]);
  const [route, setRoute] = useState<{ hops: number; cost: number } | null>(null);

  // Cihaz açıldığı anda kendini canlı düğüm olarak tanıtır (manuel buton yok).
  useEffect(() => {
    void ensureLiveNode();
    return onLiveMessage((msg) => setFeed((prev) => [...prev.slice(-80), msg]));
  }, []);

  // Dijkstra rotası gerçek eş listesi ve ölçülen gecikmeye göre tazelenir.
  useEffect(() => {
    let alive = true;
    void measureRoute(node.nodeId, node.peers, node.rttMs).then((r) => {
      if (alive) setRoute(r);
    });
    return () => {
      alive = false;
    };
  }, [node.nodeId, node.peers, node.rttMs]);

  const selfLabel = nodeLabel(node.nodeId);
  const livePeers: LivePeer[] = useMemo(() => toLivePeers(node.peers), [node.peers]);

  const participants: Participant[] = useMemo(
    () => [
      {
        id: node.nodeId || "self",
        name: selfLabel,
        handle:
          media === "data" ? "sadece veri düğümü" : media === "audio" ? "yalnız ses" : "bu cihaz",
        self: true,
      },
      ...livePeers.map((p) => ({
        id: p.id,
        name: p.label,
        handle: p.direct ? "doğrudan P2P" : "röle üzerinden",
        active: p.direct,
      })),
    ],
    [livePeers, media, node.nodeId, selfLabel],
  );

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const at = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    setFeed((prev) => [
      ...prev,
      { id: `self-${Date.now()}`, from: selfLabel, at, text, self: true },
    ]);
    await broadcastText(text);
  };

  const peers = node.peers.length;
  const directPeers = node.peers.filter((p) => p.direct).length;

  return (
    <div className="flex h-[100dvh] w-full select-none flex-col overflow-hidden overflow-x-hidden bg-[#06090e] font-osui text-slate-400">
      <style>{`@keyframes tbg-wave{0%,100%{height:4px}50%{height:16px}}`}</style>

      {/* ÜST BAR */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#0b101d] px-3 py-2 text-[11px]">
        <div className="flex min-w-0 items-center gap-2 text-sm font-bold tracking-wide text-emerald-400">
          <Box className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>Web-OS</span>
          <span className="hidden truncate font-normal text-slate-500 sm:inline">
            tedbirge-protokol/src
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900/80 px-2.5 py-1">
            <span className="hidden text-slate-400 sm:inline">SİSTEM DURUMU:</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> start.ts
              ÇEVRİMİÇİ
            </span>
            <span className="ml-1 hidden items-center gap-1.5 font-medium text-emerald-400 md:inline-flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> server.ts
              ÇEVRİMİÇİ
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 font-osmono text-emerald-400">
            <Shield className="h-3.5 w-3.5" />
            <span>GÜVENLİ (AES-256-GCM)</span>
          </div>
          <div className="hidden items-center gap-2 text-slate-400 lg:flex">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>
              ÇALIŞMA SÜRESİ: <strong className="font-osmono text-slate-200">12g 6sa 24dk</strong>
            </span>
          </div>
          <Link
            to="/panel"
            className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300"
          >
            <CircleUser className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-osmono">node_admin</span>
          </Link>
        </div>
      </header>

      {/* ANA DÜZEN */}
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden p-2">
        {/* SOL MENÜ */}
        <aside className="hidden w-52 shrink-0 flex-col justify-between rounded-lg border border-slate-800/80 bg-[#0b101d] p-3 text-xs lg:flex">
          <div>
            <div className="mb-2 font-osmono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Gezinme
            </div>
            <nav className="space-y-1 font-osmono">
              <span className="flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 font-medium text-emerald-400">
                <FolderOpen className="h-3.5 w-3.5" /> routes/
              </span>
              {["kernel/", "components/", "wasm/"].map((f) => (
                <span
                  key={f}
                  className="flex items-center gap-2 rounded px-2.5 py-2 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                >
                  <Folder className="h-3.5 w-3.5" /> {f}
                </span>
              ))}
            </nav>

            <div className="mb-2 mt-5 font-osmono text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Sistem
            </div>
            <nav className="space-y-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded px-2.5 py-2 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-cyan-400" /> Kontrol Paneli
              </Link>
              <Link
                to="/kapsama"
                className="flex items-center gap-2 rounded px-2.5 py-2 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <Share2 className="h-3.5 w-3.5 text-cyan-400" /> Ağ
              </Link>
              <Link
                to="/system"
                className="flex items-center gap-2 rounded px-2.5 py-2 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <TerminalSquare className="h-3.5 w-3.5 text-cyan-400" /> Terminal
              </Link>
              <Link
                to="/app"
                className="flex items-center gap-2 rounded px-2.5 py-2 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <FolderTree className="h-3.5 w-3.5 text-cyan-400" /> Dosyalar
              </Link>
              <Link
                to="/guvenlik"
                className="flex items-center gap-2 rounded px-2.5 py-2 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Güvenlik
              </Link>
              <Link
                to="/izinler"
                className="flex items-center gap-2 rounded px-2.5 py-2 text-slate-300 hover:bg-slate-800/50 hover:text-slate-100"
              >
                <Settings className="h-3.5 w-3.5 text-cyan-400" /> Ayarlar
              </Link>
            </nav>
          </div>

          <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 font-osmono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">P2P AĞ DURUMU</span>
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" /> BAĞLI
              </span>
            </div>
            <div className="text-slate-400">
              DÜĞÜM KİMLİĞİ: <span className="text-slate-200">THIS_NODE</span>
            </div>
            <div className="text-slate-400">
              ROL: <span className="font-bold text-cyan-400">SÜPER EŞ</span>
            </div>
            <div className="text-slate-400">
              SÜRÜM: <span className="text-slate-200">v2.7.1</span>
            </div>
          </div>
        </aside>

        {/* İÇERİK: 3 BLOK */}
        <main className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-2 overflow-y-auto xl:grid-cols-12 xl:overflow-hidden">
          {/* SOL BLOK — AĞ ÖZETİ + TOPOLOJİ */}
          <div className="flex min-w-0 flex-col gap-2 xl:col-span-3 xl:overflow-y-auto">
            <Panel className="space-y-2">
              <PanelTitle icon={<Globe className="h-3.5 w-3.5 text-emerald-400" />}>
                AĞ ÖZETİ
              </PanelTitle>
              <div className="flex items-baseline justify-between pt-1">
                <span className="font-osmono text-3xl font-extrabold text-emerald-400">823</span>
                <span className="text-xs font-medium text-slate-400">AKTİF DÜĞÜM</span>
              </div>
              <div className="space-y-1 border-t border-slate-800/60 pt-2 font-osmono text-[11px] text-slate-400">
                <Row k="TOPLAM DÜĞÜM:" v="1,284" />
                <Row k="AKTİF BAĞLANTI:" v="823" tone="text-emerald-400" />
                <Row k="AĞ ÇALIŞMA SÜRESİ:" v="12g 6sa 24dk" />
                <Row k="PROTOKOL:" v="P2P v2.7.1" tone="text-cyan-400" />
              </div>
            </Panel>

            <Panel className="flex min-h-[280px] flex-1 flex-col">
              <PanelTitle icon={<Network className="h-3.5 w-3.5 text-cyan-400" />}>
                P2P TOPOLOJİSİ
              </PanelTitle>
              <div className="relative mt-2 min-h-[160px] w-full flex-1 overflow-hidden rounded border border-slate-900 bg-[#070b13]">
                <MiniMeshCanvas />
              </div>
              <div className="mt-2 space-y-1 border-t border-slate-800/60 pt-2 font-osmono text-[10px] text-slate-400">
                <Row k="ORT. GECİKME:" v="12ms" tone="text-emerald-400" />
                <Row k="PAKET KAYBI:" v="%0.12" tone="text-emerald-400" />
                <Row k="BANT GENİŞLİĞİ PUANI:" v="98.7 / 100" tone="text-cyan-400" />
                <Row k="AĞ SAĞLIĞI:" v="MÜKEMMEL" tone="font-bold text-emerald-400" />
              </div>
            </Panel>
          </div>

          {/* ORTA BLOK — VİDEO IZGARASI */}
          <div className="flex min-h-[420px] min-w-0 flex-col rounded-lg border border-slate-800/80 bg-[#0b101d] p-3 xl:col-span-6 xl:min-h-0">
            <PanelTitle
              icon={<Video className="h-4 w-4 text-emerald-400" />}
              right={<Lock className="h-3.5 w-3.5 text-emerald-400" />}
            >
              <span className="flex items-center gap-2">
                P2P VİDEO VE SES
                <span className="hidden rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-osmono text-[10px] font-normal text-slate-400 sm:inline-flex sm:items-center sm:gap-1">
                  <Users className="h-3 w-3 text-cyan-400" /> {participants.length} KATILIMCI
                </span>
              </span>
            </PanelTitle>

            <div className="my-2 grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {participants.map((p) => (
                <VideoTile key={p.id} p={p} />
              ))}
              {peers === 0 ? (
                <div className="col-span-full grid min-h-[140px] place-items-center rounded-lg border border-dashed border-emerald-500/20 bg-slate-950/60 p-4 text-center font-osmono text-[11px] text-slate-500">
                  Bağlı Eş Bulunmuyor / Sinyal Bekleniyor…
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
              <div className="mb-2 text-center font-osmono text-[10px] text-slate-500">
                {media === "data"
                  ? "SADECE VERİ DÜĞÜMÜ — KAMERA/MİKROFON KAPALI"
                  : media === "audio"
                    ? "SES DÜĞÜMÜ — KAMERA KAPALI"
                    : "DOĞRUDAN P2P WEBRTC AKIŞI"}{" "}
                | AES-256-GCM |{" "}
                {node.rttMs != null ? `${node.rttMs}ms GECİKME` : "GECİKME ÖLÇÜLÜYOR"}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { icon: Video, label: "Kamera" },
                  { icon: Mic, label: "Mikrofon" },
                  { icon: MonitorUp, label: "Ekran paylaşımı" },
                  { icon: Users, label: "Katılımcılar" },
                  { icon: MoreHorizontal, label: "Diğer" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Görüşmeyi bitir"
                  className="grid h-10 w-10 place-items-center rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                >
                  <PhoneOff className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* SAĞ BLOK — ŞİFRELİ MESAJLAŞMA */}
          <div className="flex min-h-[420px] min-w-0 flex-col rounded-lg border border-slate-800/80 bg-[#0b101d] p-3 xl:col-span-3 xl:min-h-0">
            <PanelTitle
              icon={<Lock className="h-3.5 w-3.5 text-emerald-400" />}
              right={
                <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 font-osmono text-[9px] text-emerald-400">
                  UÇTAN UCA ŞİFRELEME AKTİF
                </span>
              }
            >
              ŞİFRELEME MESAJLAŞMA
            </PanelTitle>

            <div className="flex items-center justify-between gap-2 py-2 text-xs">
              <span className="flex min-w-0 items-center gap-2 truncate">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${directPeers > 0 ? "bg-emerald-400" : "bg-slate-600"}`}
                />
                <strong className="truncate text-slate-200">Mesh Yayını</strong>
                <span className="shrink-0 text-[10px] text-slate-500">
                  {peers} eş{route ? ` · ${route.hops} sıçrama` : ""}
                </span>
              </span>
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            </div>

            <div className="my-1 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 font-osmono text-xs">
              {feed.length === 0 ? (
                <p className="pt-6 text-center text-[11px] text-slate-500">
                  Bağlı Eş Bulunmuyor / Sinyal Bekleniyor…
                </p>
              ) : null}
              {feed.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="flex justify-between gap-2 text-[10px] text-slate-400">
                    <span className="truncate font-bold text-slate-300">
                      {m.self ? "Siz" : m.from}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {m.at} <Lock className="h-2.5 w-2.5 text-emerald-400" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{m.text}</p>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 p-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Şifreli mesajınızı yazın..."
                className="min-w-0 flex-1 bg-transparent font-osmono text-xs text-slate-200 outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                aria-label="Dosya ekle"
                className="grid h-8 w-8 place-items-center text-slate-400 hover:text-slate-200"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="submit"
                aria-label="Sesli mesaj / gönder"
                className="grid h-8 w-8 place-items-center text-emerald-400 hover:text-emerald-300"
              >
                <Mic className="h-4 w-4" />
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* ALT TELEMETRİ BARI */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-800/80 bg-[#0b101d] px-3 py-1.5 font-osmono text-[10px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400">
            AĞ: <strong className="text-emerald-400">CANLI</strong>
          </span>
          <span className="text-slate-400">
            YÜKLEME: <strong className="text-slate-200">85.7 Mbps</strong>
          </span>
          <span className="text-slate-400">
            İNDİRME: <strong className="text-slate-200">32.4 Mbps</strong>
          </span>
          <span className="hidden text-slate-400 md:inline">
            SİSTEM YÜKÜ: <strong className="text-emerald-400">NORMAL</strong> · CPU:{" "}
            <strong className="text-slate-200">23%</strong> · RAM:{" "}
            <strong className="text-slate-200">41%</strong> · GPU:{" "}
            <strong className="text-slate-200">18%</strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden text-slate-400 lg:inline">
            DİSK G/Ç: <strong className="text-slate-200">48%</strong> · OKUMA: 248 MB/s · YAZMA: 182
            MB/s
          </span>
          <span className="text-slate-400">
            EŞ AKTİVİTESİ: <span className="text-emerald-400">+{peers} CANLI</span> ·{" "}
            <span className="text-rose-400">-3 DÜŞEN</span>
          </span>
          <span className="flex items-center gap-1 font-bold text-emerald-400">
            <Shield className="h-3 w-3" /> AES-256-GCM
          </span>
        </div>
      </footer>
    </div>
  );
}
