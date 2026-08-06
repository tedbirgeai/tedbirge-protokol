import { MessageCircle, Phone, Settings, Users } from "lucide-react";

import { Avatar } from "@/components/chat/Avatar";
import { pressFeedback } from "@/lib/chat/sounds";
import type { MobileTab } from "@/components/chat/MobileTabBar";

/**
 * MASAÜSTÜ SOL RAY
 * ------------------------------------------------------------------
 * Yalnızca md ve üzeri genişlikte görünür. Mobil alt sekme çubuğunun
 * masaüstü karşılığıdır; aynı sekme durumunu kullanır, bu yüzden iki
 * düzen arasında davranış farkı oluşmaz. Genişlik `--wa-rail-w`.
 */
const ITEMS: { id: MobileTab; label: string }[] = [
  { id: "chats", label: "Sohbetler" },
  { id: "calls", label: "Aramalar" },
  { id: "communities", label: "Topluluklar" },
];

export function DesktopRail({
  value,
  onChange,
  meName,
  meAvatar,
  unread,
  onSettings,
}: {
  value: MobileTab;
  onChange: (tab: MobileTab) => void;
  meName: string;
  meAvatar?: string | undefined;
  unread?: number;
  onSettings: () => void;
}) {
  return (
    <nav
      className="hidden h-full shrink-0 flex-col items-center justify-between py-3 md:flex"
      aria-label="Bölümler"
      style={{
        width: "var(--wa-rail-w, 72px)",
        background: "var(--wa-panel-soft)",
        borderRight: "1px solid var(--wa-border)",
      }}
    >
      <div className="flex flex-col items-center gap-1">
        {ITEMS.map((it) => {
          const on = value === it.id;
          return (
            <button
              key={it.id}
              type="button"
              title={it.label}
              aria-label={it.label}
              aria-current={on ? "page" : undefined}
              onClick={() => {
                pressFeedback();
                onChange(it.id);
              }}
              className="wa-press flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                background: on ? "var(--wa-accent-soft)" : "transparent",
                color: on ? "var(--wa-accent)" : "var(--wa-muted)",
              }}
            >
              <span className="relative flex items-center justify-center">
                {it.id === "chats" && <MessageCircle className="h-6 w-6" />}
                {it.id === "calls" && <Phone className="h-6 w-6" />}
                {it.id === "communities" && <Users className="h-6 w-6" />}
                {it.id === "chats" && !!unread && unread > 0 && (
                  <span
                    className="absolute -right-2 -top-1 rounded-full px-1.5 text-[10px] font-bold text-white"
                    style={{ background: "var(--wa-accent)" }}
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          title="Ayarlar"
          aria-label="Ayarlar"
          onClick={() => {
            pressFeedback();
            onSettings();
          }}
          className="wa-press flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ color: "var(--wa-muted)" }}
        >
          <Settings className="h-6 w-6" />
        </button>
        <button
          type="button"
          title="Profiliniz"
          aria-label="Profiliniz"
          aria-current={value === "me" ? "page" : undefined}
          onClick={() => {
            pressFeedback();
            onChange("me");
          }}
          className="wa-press rounded-full"
          style={{
            outline: value === "me" ? "2px solid var(--wa-accent)" : "none",
            outlineOffset: 2,
          }}
        >
          <Avatar name={meName} src={meAvatar} size={36} />
        </button>
      </div>
    </nav>
  );
}
