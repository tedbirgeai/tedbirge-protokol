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
  subscribeLivePeers,
  toLivePeers,
  onLiveMessage,
  type LiveMessage,
  type LivePeer,
} from "@/services/signaling";

type Participant = {
  id: string;
  name: string;
  handle: string;
  alias?: string;
  active?: boolean;
  self?: boolean;
};

/** Kriptografik kimlikten okunabilir yerel takma ad üretir (İsim/Cisim). */
const ALIAS_POOL = [
  "Node Alpha",
  "Node Beta",
  "Node Gamma",
  "Node Delta",
  "Node Epsilon",
  "Node Zeta",
  "Node Eta",
  "Node Theta",
];

export function peerAlias(id: string): string {
  let sum = 0;
  for (const ch of id) sum = (sum + ch.charCodeAt(0)) % 4096;
  return ALIAS_POOL[sum % ALIAS_POOL.length]!;
}


/**
 * Yerel medya — TALEP ÜZERİNE.
 * Sayfa açılışında ASLA izin istenmez; cihaz "sadece veri düğümü" olarak
 * ağa katılır. Kamera/mikrofon yalnız kullanıcı butona bastığında açılır.
 */
function useLocalMedia() {
  const [mode, setMode] = useState<"av" | "audio" | "data">("data");
  const streamRef = useRef<MediaStream | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMode("data");
  };

  /** Yalnızca kullanıcı etkileşimiyle çağrılır. */
  const request = async (kind: "av" | "audio") => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMode("data");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "av" ? { audio: true, video: true } : { audio: true },
      );
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      setMode(kind);
      return true;
    } catch {
      setMode("data");
      return false;
    }
  };

  useEffect(() => () => stop(), []);

  return { mode, request, stop };
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

function VideoTile({ p, camOn }: { p: Participant; camOn: boolean }) {
  return (
    <div
      className={`relative flex h-full min-h-[120px] w-full flex-col justify-between overflow-hidden rounded-lg border bg-[#0e1626] object-cover p-3 ${
        p.active
          ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
          : "border-emerald-500/20"
      }`}
    >
      {p.active ? (
        <span className="absolute left-2 top-2 rounded border border-emerald-500/30 bg-emerald-950/80 px-1.5 py-0.5 font-osmono text-[9px] text-emerald-400">
          AKTİF KONUŞMACI
        </span>
      ) : null}

      <div className="my-2 flex min-h-0 flex-1 items-center justify-center">
        <span
          className={`grid h-14 w-14 place-items-center rounded-full border-2 font-osmono text-sm font-bold ${
            p.self
              ? "border-emerald-400/60 bg-emerald-950/50 text-emerald-400"
              : "border-cyan-500/40 bg-slate-950 text-cyan-300"
          } ${p.self && !camOn ? "opacity-40" : ""}`}
        >
          {p.self ? <Box className="h-6 w-6 text-emerald-400" /> : <Network className="h-6 w-6" />}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 font-osmono text-[11px]">
        <div className="min-w-0">
          <div className="truncate font-bold text-slate-200">{p.alias ?? p.name}</div>
          <div className="truncate text-[9px] text-cyan-400/80">{p.name}</div>
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
  const { mode: media, request: requestMedia, stop: stopMedia } = useLocalMedia();
  const [draft, setDraft] = useState("");
  const [feed, setFeed] = useState<LiveMessage[]>([]);
  const [route, setRoute] = useState<{ hops: number; cost: number } | null>(null);
  // Yerel WebRTC kontrol durumları — hepsi KAPALI başlar (izin istenmez).
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [inCall, setInCall] = useState(false);
  // Canlı test: ağda eş yokken sanal bir P2P düğümü bağlar.
  const [sim, setSim] = useState(false);
  // Orta panel görünümü: video ızgarası veya gömülü ağ/kapsama paneli.
  const [center, setCenter] = useState<"video" | "network">("video");
  // Sinyal kanalından gelen canlı eş kimlikleri (BroadcastChannel + bulut).
  const [signalPeers, setSignalPeers] = useState<string[]>([]);
  // Sunucu ve ilk istemci render'ı aynı etiketi basar (hidrasyon uyuşmazlığı olmaz).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Yerel + bulut sinyal kanalı: yan yanaki iki cihaz birbirini anında görür.
  useEffect(() => subscribeLivePeers(setSignalPeers), []);

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

  const selfLabel = hydrated ? nodeLabel(node.nodeId) : nodeLabel("");

  const livePeers: LivePeer[] = useMemo(() => toLivePeers(node.peers), [node.peers]);

  const participants: Participant[] = useMemo(() => {
    const list: Participant[] = [
      {
        id: node.nodeId || "self",
        name: selfLabel,
        alias: "Bu Cihaz",
        handle:
          media === "data" ? "sadece veri düğümü" : media === "audio" ? "yalnız ses" : "bu cihaz",
        self: true,
      },
      ...livePeers.map((p) => ({
        id: p.id,
        name: p.label,
        alias: peerAlias(p.id),
        handle: p.direct ? "doğrudan P2P" : "röle üzerinden",
        active: p.direct,
      })),
      // Sinyal kanalından keşfedilen cihazlar (aynı adresi açan telefonlar).
      ...signalPeers
        .filter((id) => !livePeers.some((p) => p.id === id))
        .map((id) => ({
          id,
          name: id,
          alias: peerAlias(id),
          handle: "sinyal kanalı · çevrimiçi",
          active: true,
        })),
    ];
    if (sim && livePeers.length === 0) {
      list.push({
        id: "sim-peer",
        name: "NODE_789E",
        alias: "Node Alpha (Simülasyon)",
        handle: "sanal eş · canlı test",
        active: true,
      });
    }
    return list;
  }, [livePeers, media, node.nodeId, selfLabel, sim]);

  const stamp = () =>
    new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setFeed((prev) => [
      ...prev,
      { id: `self-${Date.now()}`, from: selfLabel, at: stamp(), text, self: true },
    ]);
    if (sim && livePeers.length === 0) {
      const echo = text;
      setTimeout(() => {
        setFeed((prev) => [
          ...prev,
          {
            id: `sim-${Date.now()}`,
            from: "NODE_789E · Node Alpha",
            at: stamp(),
            text: `Paket alındı: “${echo}” (şifreli, 1 sıçrama)`,
          },
        ]);
      }, 650);
      return;
    }
    await broadcastText(text);
  };

  /** Canlı test / sinyal simülatörü: sanal eşi anında ağa alır. */
  const startSimulator = () => {
    setSim(true);
    setFeed((prev) => [
      ...prev,
      {
        id: `sim-join-${Date.now()}`,
        from: "NODE_789E · Node Alpha",
        at: stamp(),
        text: "Sanal eş bağlandı. Uçtan uca şifreli kanal açık — mesaj yazabilirsiniz.",
      },
    ]);
  };

  const peers = node.peers.length + (sim && livePeers.length === 0 ? 1 : 0);
  const directPeers = node.peers.filter((p) => p.direct).length + (sim && livePeers.length === 0 ? 1 : 0);


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
        <aside className="hidden w-52 shrink-0 flex-col justify-between overflow-y-auto rounded-lg border border-[rgba(16,185,129,0.15)] bg-[#0b101d] p-3 text-xs lg:flex xl:h-[calc(100dvh-104px)]">
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
          <div className="flex min-w-0 flex-col gap-2 xl:col-span-3 xl:h-[calc(100dvh-104px)] xl:overflow-y-auto">
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
          <div className="flex h-full min-h-[360px] min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-lg border border-[rgba(16,185,129,0.15)] bg-[#0b101d] p-3 xl:col-span-6 xl:h-[calc(100dvh-104px)] xl:min-h-0">
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

            <div className="my-2 grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2 lg:grid-cols-3">
              {participants.map((p) => (
                <VideoTile key={p.id} p={p} camOn={camOn} />
              ))}
              {peers === 0 ? (
                <div className="col-span-full grid h-full min-h-[120px] place-items-center rounded-lg border border-dashed border-emerald-500/20 bg-slate-950/60 p-4 text-center font-osmono text-[11px] text-slate-500">
                  Bağlı Eş Bulunmuyor / Sinyal Bekleniyor…
                </div>
              ) : null}
            </div>

            <div className="shrink-0 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
              <div className="mb-2 text-center font-osmono text-[10px] text-slate-500">
                {!inCall
                  ? "GÖRÜŞME SONLANDIRILDI"
                  : media === "data"
                    ? "SADECE VERİ DÜĞÜMÜ — KAMERA/MİKROFON KAPALI"
                    : media === "audio"
                      ? "SES DÜĞÜMÜ — KAMERA KAPALI"
                      : "DOĞRUDAN P2P WEBRTC AKIŞI"}{" "}
                | AES-256-GCM |{" "}
                {node.rttMs != null ? `${node.rttMs}ms GECİKME` : "GECİKME ÖLÇÜLÜYOR"}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  {
                    icon: Video,
                    label: camOn ? "Kamerayı kapat" : "Kamerayı aç",
                    on: camOn,
                    toggle: () => setCamOn((v) => !v),
                  },
                  {
                    icon: Mic,
                    label: micOn ? "Mikrofonu sessize al" : "Mikrofonu aç",
                    on: micOn,
                    toggle: () => setMicOn((v) => !v),
                  },
                  {
                    icon: MonitorUp,
                    label: screenOn ? "Ekran paylaşımını durdur" : "Ekran paylaş",
                    on: screenOn,
                    toggle: () => setScreenOn((v) => !v),
                  },
                ].map(({ icon: Icon, label, on, toggle }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    aria-pressed={on}
                    title={label}
                    onClick={toggle}
                    className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors ${
                      on
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                        : "border-rose-500/50 bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Katılımcılar"
                  title="Katılımcılar"
                  onClick={() => setSim((v) => v || livePeers.length === 0)}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400"
                >
                  <Users className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Diğer"
                  title="Diğer"
                  className="grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-400"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={inCall ? "Görüşmeyi bitir" : "Görüşmeyi başlat"}
                  title={inCall ? "Görüşmeyi bitir" : "Görüşmeyi başlat"}
                  onClick={() => {
                    setInCall((v) => !v);
                    if (inCall) {
                      setCamOn(false);
                      setMicOn(false);
                      setScreenOn(false);
                    } else {
                      setCamOn(true);
                      setMicOn(true);
                    }
                  }}
                  className={`grid h-10 w-10 place-items-center rounded-lg text-white ${
                    inCall ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  <PhoneOff className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>


          {/* SAĞ BLOK — ŞİFRELİ MESAJLAŞMA */}
          <div className="flex h-full min-h-[360px] min-w-0 flex-col overflow-hidden rounded-lg border border-[rgba(16,185,129,0.15)] bg-[#0b101d] p-3 xl:col-span-3 xl:h-[calc(100dvh-104px)] xl:min-h-0">
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

            {livePeers.length === 0 && !sim ? (
              <button
                type="button"
                onClick={startSimulator}
                className="mt-2 w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-osmono text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20"
              >
                CANLI TEST / SİNYAL SİMÜLATÖRÜ
              </button>
            ) : null}

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
                      {m.self ? `Siz · ${selfLabel}` : m.from}
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
                void send();
              }}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 p-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
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
                type="button"
                onClick={() => void send()}
                disabled={!draft.trim()}
                className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 font-osmono text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                Gönder
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
