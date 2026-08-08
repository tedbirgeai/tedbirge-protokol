import { useState } from "react";
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

type WindowId = "music" | "media" | "files";

const TILES: {
  id: WindowId | "messenger" | "apps" | "relay" | "mesh" | "transfer";
  label: string;
  hint: string;
  icon: React.ReactNode;
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
 * tOS ÇALIŞMA ALANI
 * ------------------------------------------------------------------
 * Uygulama ızgarası: yerleşik araçlar (Müzik, Medya, Dosyalar) pencere
 * olarak açılır; kabuk pencereleri (Uygulamalar, Röle, Ağ, Aktarım)
 * mevcut diyaloglara bağlanır. Renkler kabuğun açık yeşil/gri
 * belirteçlerinden gelir.
 */
export function WorkspacePanel() {
  const [win, setWin] = useState<WindowId | null>(null);
  const [apps, setApps] = useState(false);
  const [relay, setRelay] = useState(false);
  const [mesh, setMesh] = useState(false);
  const [transfer, setTransfer] = useState(false);

  return (
    <div className="wa wa-scope flex min-h-0 flex-1 flex-col" style={{ background: "var(--wa-bg)" }}>
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--wa-border)", background: "var(--wa-panel)" }}
      >
        <h1 className="text-[19px] font-bold" style={{ color: "var(--wa-text)" }}>
          Tedbirge OS
        </h1>
        <Link to="/system" className="text-[14px]" style={{ color: "var(--wa-accent)" }}>
          Sistem
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TILES.map((t) =>
            t.id === "messenger" ? (
              <Link
                key={t.id}
                to="/chat"
                className="wa-press flex min-h-24 flex-col justify-between rounded-2xl p-3"
                style={{ background: "var(--wa-panel)", border: "1px solid var(--wa-border)" }}
              >
                <Tile icon={t.icon} label={t.label} hint={t.hint} />
              </Link>
            ) : (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  pressFeedback();
                  if (t.id === "apps") setApps(true);
                  else if (t.id === "relay") setRelay(true);
                  else if (t.id === "mesh") setMesh(true);
                  else if (t.id === "transfer") setTransfer(true);
                  else setWin(t.id as WindowId);
                }}
                className="wa-press flex min-h-24 flex-col justify-between rounded-2xl p-3 text-left"
                style={{ background: "var(--wa-panel)", border: "1px solid var(--wa-border)" }}
              >
                <Tile icon={t.icon} label={t.label} hint={t.hint} />
              </button>
            ),
          )}
        </div>
      </div>

      {win && (
        <div className="wa wa-scope fixed inset-0 z-[70] flex justify-center bg-black/30 p-0 sm:p-6">
          <div
            className="flex min-h-0 w-full max-w-[720px] flex-col rounded-none sm:rounded-3xl"
            style={{ background: "var(--wa-panel)" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--wa-border)" }}
            >
              <h2 className="text-[17px] font-semibold" style={{ color: "var(--wa-text)" }}>
                {win === "music" ? "Müzik" : win === "media" ? "Medya" : "Dosyalar"}
              </h2>
              <button
                type="button"
                onClick={() => setWin(null)}
                aria-label="Kapat"
                className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
                style={{ color: "var(--wa-muted)" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-4">
              {win === "music" && <MusicApp />}
              {win === "media" && <MediaApp />}
              {win === "files" && <FilesApp onTransfer={() => setTransfer(true)} />}
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

function Tile({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <>
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: "var(--wa-accent-soft)", color: "var(--wa-accent)" }}
      >
        {icon}
      </span>
      <span className="mt-2 block">
        <span className="block text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
          {label}
        </span>
        <span className="block text-[12px]" style={{ color: "var(--wa-muted)" }}>
          {hint}
        </span>
      </span>
    </>
  );
}
