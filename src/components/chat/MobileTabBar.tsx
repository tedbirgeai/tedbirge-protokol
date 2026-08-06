import { MessageCircle, Phone, Users } from "lucide-react";

import { pressFeedback } from "@/lib/chat/sounds";
import { Avatar } from "@/components/chat/Avatar";

export type MobileTab = "calls" | "communities" | "chats" | "me";

const TABS: { id: MobileTab; label: string }[] = [
  { id: "calls", label: "Aramalar" },
  { id: "communities", label: "Topluluklar" },
  { id: "chats", label: "Sohbetler" },
  { id: "me", label: "Siz" },
];

/**
 * MOBİL ALT SEKME ÇUBUĞU
 * ------------------------------------------------------------------
 * Yalnızca telefon genişliğinde görünür (md altı). Masaüstü düzeni
 * değişmez. Yükseklik `--wa-tabbar-h` ile sabittir ve alt güvenli
 * alan (ev çubuğu) otomatik eklenir.
 */
export function MobileTabBar({
  value,
  onChange,
  meName,
  meAvatar,
  unread,
}: {
  value: MobileTab;
  onChange: (tab: MobileTab) => void;
  meName: string;
  meAvatar?: string | undefined;
  unread?: number;
}) {
  return (
    <nav
      className="wa-tabbar md:hidden"
      aria-label="Ana gezinme"
      style={{ background: "var(--wa-panel)", borderTop: "1px solid var(--wa-border)" }}
    >
      {TABS.map((t) => {
        const on = value === t.id;
        const color = on ? "var(--wa-text)" : "var(--wa-muted)";
        return (
          <button
            key={t.id}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => {
              pressFeedback();
              onChange(t.id);
            }}
            className="wa-press flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1"
            style={{ color }}
          >
            <span className="relative flex h-7 items-center justify-center">
              {t.id === "calls" && <Phone className="h-6 w-6" strokeWidth={on ? 2.6 : 1.9} />}
              {t.id === "communities" && <Users className="h-6 w-6" strokeWidth={on ? 2.6 : 1.9} />}
              {t.id === "chats" && (
                <>
                  <MessageCircle className="h-6 w-6" strokeWidth={on ? 2.6 : 1.9} />
                  {!!unread && unread > 0 && (
                    <span
                      className="absolute -right-2 -top-1 rounded-full px-1.5 text-[10px] font-bold text-white"
                      style={{ background: "var(--wa-accent)" }}
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </>
              )}
              {t.id === "me" && (
                <span
                  className="rounded-full"
                  style={{ outline: on ? "2px solid var(--wa-text)" : "none", outlineOffset: 2 }}
                >
                  <Avatar name={meName} src={meAvatar} size={26} />
                </span>
              )}
            </span>
            <span
              className="truncate text-[11px]"
              style={{ fontWeight: on ? 700 : 500, maxWidth: "100%" }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
