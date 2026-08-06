import { CalendarClock, Grid3X3, Heart, Phone } from "lucide-react";

import { CallHistory } from "@/components/chat/CallHistory";
import { pressFeedback } from "@/lib/chat/sounds";

/**
 * MOBİL "ARAMALAR" SEKMESİ
 * ------------------------------------------------------------------
 * Üstte hızlı kısayollar, altta mevcut arama geçmişi listesi.
 * İş mantığı değişmez; yalnızca sunum katmanıdır.
 */
export function CallsPanel({
  onCall,
  onNewCall,
}: {
  onCall: (peerId: string, video: boolean) => void;
  onNewCall: () => void;
}) {
  const shortcuts = [
    { id: "ara", label: "Ara", icon: Phone, action: onNewCall, ready: true },
    { id: "planla", label: "Planla", icon: CalendarClock, action: undefined, ready: false },
    { id: "tus", label: "Tuş takımı", icon: Grid3X3, action: onNewCall, ready: true },
    { id: "fav", label: "Favoriler", icon: Heart, action: undefined, ready: false },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="grid grid-cols-4 gap-2 px-3 py-4">
        {shortcuts.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={!s.ready}
            onClick={() => {
              if (!s.ready || !s.action) return;
              pressFeedback();
              s.action();
            }}
            className="wa-press flex flex-col items-center gap-2 disabled:opacity-40"
            style={{ color: "var(--wa-text)" }}
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--wa-panel-soft)" }}
            >
              <s.icon className="h-6 w-6" />
            </span>
            <span className="truncate text-[13px]" style={{ color: "var(--wa-muted)" }}>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <h2 className="px-4 pb-1 text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
        En Son
      </h2>
      <CallHistory onCall={onCall} />
    </div>
  );
}
