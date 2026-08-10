import { Suspense, lazy, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  FileUp,
  FolderOpen,
  MessageCircle,
  Music,
  PlayCircle,
  Radio,
  X,
} from "lucide-react";

import { MusicApp } from "@/components/shell/apps/MusicApp";
import { MediaApp } from "@/components/shell/apps/MediaApp";
import { FilesApp } from "@/components/shell/apps/FilesApp";
import { AppsDialog } from "@/components/shell/AppsDialog";
import { RelaySettingsDialog } from "@/components/shell/RelaySettingsDialog";
import { MeshStatusDialog } from "@/components/shell/MeshStatusDialog";
import { FileTransferDialog } from "@/components/shell/FileTransferDialog";
import { pressFeedback } from "@/lib/chat/sounds";
import { describeNode } from "@/lib/node-runtime";
import { useShell } from "@/shell/ShellProvider";

/** Messenger ağır bir uygulamadır: yalnız penceresi açıldığında yüklenir. */
const MessengerApp = lazy(() => import("@/components/Messenger"));

type WindowId = "messenger" | "music" | "media" | "files";

const WINDOW_TITLES: Record<WindowId, string> = {
  messenger: "Messenger — P2P Ses / Görüntü",
  music: "Müzik",
  media: "Medya — Wasm Kum Havuzu Oynatıcı",
  files: "Dosyalar",
};

const TILES: {
  id: WindowId | "apps" | "relay" | "mesh" | "transfer";
  label: string;
  hint: string;
  icon: ReactNode;
}[] = [
  {
    id: "messenger",
    label: "Messenger",
    hint: "Sohbet, sesli ve görüntülü arama",
    icon: <MessageCircle className="h-6 w-6" />,
  },
  { id: "music", label: "Müzik", hint: "Cihazdaki parçalar", icon: <Music className="h-6 w-6" /> },
  {
    id: "media",
    label: "Medya",
    hint: "Video ve YouTube oynatıcı",
    icon: <PlayCircle className="h-6 w-6" />,
  },
  {
    id: "files",
    label: "Dosyalar",
    hint: "Dosya yöneticisi",
    icon: <FolderOpen className="h-6 w-6" />,
  },
  {
    id: "transfer",
    label: "Aktarım",
    hint: "Eşler arası dosya gönderimi",
    icon: <FileUp className="h-6 w-6" />,
  },
  {
    id: "apps",
    label: "Uygulamalar",
    hint: "Kurulu .tbapp paketleri",
    icon: <Boxes className="h-6 w-6" />,
  },
  { id: "mesh", label: "Ağ", hint: "Düğüm ve mesh durumu", icon: <Activity className="h-6 w-6" /> },
  { id: "relay", label: "Röle", hint: "Taşıma ayarları", icon: <Radio className="h-6 w-6" /> },
];

/**
 * tOS ÇALIŞMA ALANI (Web-OS Kabuğu)
 * ------------------------------------------------------------------
 * Uygulama ızgarası masaüstü işletim sistemi mantığıyla çalışır:
 * her simge rota değiştirmeden ekran ortasında bir pencere açar.
 * Renkler kilitli koyu siber (#06090e / #0b101d) paletinden gelir.
 */
export function WorkspacePanel() {
  const [win, setWin] = useState<WindowId | null>(null);
  const [apps, setApps] = useState(false);
  const [relay, setRelay] = useState(false);
  const [mesh, setMesh] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const { node } = useShell();
  const status = describeNode(node);

  return (
    <div className="tbos cyber-grid flex min-h-0 flex-1 flex-col">
      <header
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:justify-between"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(11,16,29,0.85)" }}
      >
        <div className="min-w-0">
          <h1 className="truncate font-osmono text-[17px] font-bold tracking-tight text-slate-100">
            TEDBİRGE<span className="text-emerald-400"> OS</span>
          </h1>
          <p className="truncate font-osmono text-[11px] text-slate-500">
            THIS_NODE · {status.text} · eş {status.directPeers} · kuyruk {status.queued}
          </p>
        </div>
        <Link
          to="/system"
          className="shrink-0 rounded-md border border-emerald-500/20 px-3 py-2 font-osmono text-[12px] text-emerald-400"
        >
          Sistem
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TILES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                pressFeedback();
                if (t.id === "apps") setApps(true);
                else if (t.id === "relay") setRelay(true);
                else if (t.id === "mesh") setMesh(true);
                else if (t.id === "transfer") setTransfer(true);
                else setWin(t.id);
              }}
              className="wa-press flex min-h-24 flex-col justify-between rounded-2xl border border-emerald-500/15 bg-[#0b101d] p-3 text-left transition-colors hover:border-emerald-500/40"
            >
              <Tile icon={t.icon} label={t.label} hint={t.hint} />
            </button>
          ))}
        </div>
      </div>

      {win && (
        <div className="tbos fixed inset-0 z-[70] flex items-stretch justify-center bg-black/60 p-0 sm:items-center sm:p-6">
          <div
            className={`tbos-window flex min-h-0 w-full flex-col rounded-none sm:rounded-2xl ${
              win === "messenger" ? "max-w-[1400px] sm:h-[92vh]" : "max-w-[820px] sm:h-[80vh]"
            }`}
          >
            <div
              className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex shrink-0 gap-1.5">
                  <i className="block h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <i className="block h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <i className="block h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                </span>
                <h2 className="truncate font-osmono text-[13px] text-slate-300">
                  {WINDOW_TITLES[win]}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setWin(null)}
                aria-label="Kapat"
                className="wa-press flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {win === "messenger" ? (
                <Suspense
                  fallback={
                    <div className="flex flex-1 items-center justify-center font-osmono text-[12px] text-slate-500">
                      Messenger yükleniyor…
                    </div>
                  }
                >
                  <div className="min-h-0 flex-1 overflow-auto [&>div]:h-full">
                    <MessengerApp />
                  </div>
                </Suspense>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
                  {win === "music" && <MusicApp />}
                  {win === "media" && <MediaApp />}
                  {win === "files" && <FilesApp onTransfer={() => setTransfer(true)} />}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AppsDialog open={apps} onClose={() => setApps(false)} />
      <RelaySettingsDialog open={relay} onClose={() => setRelay(false)} />
      <MeshStatusDialog open={mesh} onClose={() => setMesh(false)} />
      <FileTransferDialog open={transfer} onClose={() => setTransfer(false)} />
    </div>
  );
}

function Tile({ icon, label, hint }: { icon: ReactNode; label: string; hint: string }) {
  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
        {icon}
      </span>
      <span className="mt-2 block min-w-0">
        <span className="block truncate text-[15px] font-semibold text-slate-100">{label}</span>
        <span className="block truncate font-osmono text-[11px] text-slate-500">{hint}</span>
      </span>
    </>
  );
}
