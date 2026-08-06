/**
 * SOHBET SATIRI MENÜSÜ
 * ------------------------------------------------------------------
 * Masaüstünde sağ tık, mobilde basılı tutma ile açılır. WhatsApp'taki
 * eylem kümesinin tamamı burada tek yerde toplanır; hiçbir madde pasif
 * değildir. Tüm işaretler yalnızca bu cihazda saklanır.
 */
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CheckCheck,
  FolderPlus,
  Heart,
  HeartOff,
  Eraser,
  Mail,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";

import { pressFeedback } from "@/lib/chat/sounds";

export type RowMenuState = {
  convId: string;
  title: string;
  x: number;
  y: number;
  archived: boolean;
  pinned: boolean;
  favorite: boolean;
  unread: boolean;
};

export function ChatRowMenu({
  state,
  folders,
  onClose,
  onArchive,
  onPin,
  onToggleRead,
  onFavorite,
  onAssignList,
  onCreateList,
  onClear,
  onDelete,
}: {
  state: RowMenuState | null;
  folders: string[];
  onClose: () => void;
  onArchive: () => void;
  onPin: () => void;
  onToggleRead: () => void;
  onFavorite: () => void;
  onAssignList: (name: string) => void;
  onCreateList: () => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  const [listOpen, setListOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) setListOpen(false);
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;

  const items = [
    {
      id: "archive",
      label: state.archived ? "Arşivden çıkar" : "Sohbeti arşivle",
      icon: state.archived ? ArchiveRestore : Archive,
      run: onArchive,
    },
    {
      id: "pin",
      label: state.pinned ? "Sabitlemeyi kaldır" : "Sohbeti sabitle",
      icon: state.pinned ? PinOff : Pin,
      run: onPin,
    },
    {
      id: "read",
      label: state.unread ? "Okundu olarak işaretle" : "Okunmadı olarak işaretle",
      icon: state.unread ? CheckCheck : Mail,
      run: onToggleRead,
    },
    {
      id: "fav",
      label: state.favorite ? "Favorilerden çıkar" : "Favoriler'e ekle",
      icon: state.favorite ? HeartOff : Heart,
      run: onFavorite,
    },
    { id: "clear", label: "Sohbeti temizle", icon: Eraser, run: onClear },
    { id: "delete", label: "Sohbeti sil", icon: Trash2, run: onDelete, danger: true },
  ];

  const width = 236;
  const left = Math.max(8, Math.min(state.x, window.innerWidth - width - 8));
  const top = Math.max(8, Math.min(state.y, window.innerHeight - 340));

  return (
    <div className="fixed inset-0 z-[70]" role="presentation" onClick={onClose}>
      <div
        ref={boxRef}
        role="menu"
        aria-label={`${state.title} sohbet menüsü`}
        className="absolute overflow-hidden rounded-2xl py-1 shadow-xl"
        style={{
          left,
          top,
          width,
          background: "var(--wa-panel)",
          border: "1px solid var(--wa-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.slice(0, 4).map((it) => (
          <MenuItem key={it.id} icon={it.icon} label={it.label} onClick={() => run(it.run)} />
        ))}

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            pressFeedback();
            setListOpen((v) => !v);
          }}
          className="wa-press flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px]"
          style={{ color: "var(--wa-text)" }}
        >
          <FolderPlus className="h-4 w-4 shrink-0" style={{ color: "var(--wa-muted)" }} />
          <span className="min-w-0 flex-1 truncate">Listeye ekle</span>
        </button>
        {listOpen && (
          <div className="pb-1" style={{ background: "var(--wa-panel-soft)" }}>
            {folders.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => run(() => onAssignList(name))}
                className="wa-press block w-full truncate px-11 py-2 text-left text-[13px]"
                style={{ color: "var(--wa-text)" }}
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => run(onCreateList)}
              className="wa-press block w-full px-11 py-2 text-left text-[13px] font-semibold"
              style={{ color: "var(--wa-accent)" }}
            >
              Yeni liste…
            </button>
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--wa-border)" }} />
        {items.slice(4).map((it) => (
          <MenuItem
            key={it.id}
            icon={it.icon}
            label={it.label}
            danger={it.danger}
            onClick={() => run(it.run)}
          />
        ))}
      </div>
    </div>
  );

  function run(fn: () => void) {
    pressFeedback();
    fn();
    onClose();
  }
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="wa-press flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px]"
      style={{ color: danger ? "#c0392b" : "var(--wa-text)" }}
    >
      <Icon
        className="h-4 w-4 shrink-0"
        style={{ color: danger ? "#c0392b" : "var(--wa-muted)" }}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}
