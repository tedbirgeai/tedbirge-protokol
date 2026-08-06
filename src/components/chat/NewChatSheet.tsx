import { BookUser, QrCode, Star, Users, X } from "lucide-react";

import { pressFeedback } from "@/lib/chat/sounds";

/**
 * "+" EYLEM SAYFASI
 * ------------------------------------------------------------------
 * Mobilde alttan açılan, masaüstünde ortada duran küçük eylem listesi.
 * Yalnızca mevcut akışları tetikler; yeni iş mantığı içermez.
 */
export function NewChatSheet({
  open,
  onClose,
  onNewChat,
  onNewGroup,
  onSelfNote,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onSelfNote: () => void;
  onShare: () => void;
}) {
  if (!open) return null;

  const items = [
    { id: "chat", label: "Yeni sohbet", icon: BookUser, run: onNewChat },
    { id: "group", label: "Yeni grup", icon: Users, run: onNewGroup },
    { id: "self", label: "Kendine not", icon: Star, run: onSelfNote },
    { id: "share", label: "Kimliğimi paylaş", icon: QrCode, run: onShare },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Yeni"
        className="w-full max-w-md overflow-hidden rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:rounded-3xl"
        style={{ background: "var(--wa-panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--wa-border)" }}
        >
          <p className="text-[18px] font-bold" style={{ color: "var(--wa-text)" }}>
            Yeni
          </p>
          <button
            type="button"
            onClick={onClose}
            className="wa-press flex h-9 w-9 items-center justify-center rounded-full"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  onClose();
                  it.run();
                }}
                className="wa-press flex min-h-14 w-full items-center gap-4 px-5 text-left"
                style={{ color: "var(--wa-text)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--wa-accent-soft)", color: "var(--wa-accent)" }}
                >
                  <it.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[17px]">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
