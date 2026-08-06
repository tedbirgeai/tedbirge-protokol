import { useEffect, useState } from "react";
import { CalendarClock, Grid3X3, Heart, MoreVertical, Phone, Plus, Trash2 } from "lucide-react";

import { CallHistory } from "@/components/chat/CallHistory";
import {
  listScheduled,
  onScheduledChange,
  removeScheduled,
  type ScheduledCall,
} from "@/lib/chat/scheduled-calls";
import { pressFeedback } from "@/lib/chat/sounds";

/**
 * "ARAMALAR" SEKMESİ
 * ------------------------------------------------------------------
 * WhatsApp düzeni: üstte menü ve yeşil "+" düğmesi, büyük başlık,
 * dört kısayol dairesi (Ara · Planla · Tuş takımı · Favoriler),
 * planlanan aramalar ve "En Son" listesi. İş mantığı değişmez.
 */
export function CallsPanel({
  onCall,
  onNewCall,
  onSchedule,
  onDialpad,
  onFavorites,
  showHeader = true,
}: {
  onCall: (peerId: string, video: boolean) => void;
  onNewCall: () => void;
  onSchedule: () => void;
  onDialpad: () => void;
  onFavorites: () => void;
  showHeader?: boolean;
}) {
  const [planned, setPlanned] = useState<ScheduledCall[]>([]);

  useEffect(() => {
    const sync = () => setPlanned(listScheduled());
    sync();
    return onScheduledChange(sync);
  }, []);

  const shortcuts = [
    { id: "ara", label: "Ara", icon: Phone, action: onNewCall },
    { id: "planla", label: "Planla", icon: CalendarClock, action: onSchedule },
    { id: "tus", label: "Tuş takımı", icon: Grid3X3, action: onDialpad },
    { id: "fav", label: "Favoriler", icon: Heart, action: onFavorites },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {showHeader && (
        <div className="flex items-center justify-between px-4 pt-3">
          <button
            type="button"
            onClick={onFavorites}
            className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Arama seçenekleri"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              onNewCall();
            }}
            className="wa-press flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ background: "var(--wa-accent)" }}
            aria-label="Yeni arama"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      )}

      {showHeader && (
        <h1 className="px-4 pb-1 pt-1 text-[34px] font-bold" style={{ color: "var(--wa-text)" }}>
          Aramalar
        </h1>
      )}

      <div className="grid grid-cols-4 gap-2 px-3 py-4">
        {shortcuts.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              pressFeedback();
              s.action();
            }}
            className="wa-press flex flex-col items-center gap-2"
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

      {planned.length > 0 && (
        <>
          <h2 className="px-4 pb-1 text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
            Planlanan
          </h2>
          <ul className="pb-2">
            {planned.map((p) => (
              <li key={p.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--wa-panel-soft)", color: "var(--wa-accent)" }}
                >
                  <CalendarClock className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px]" style={{ color: "var(--wa-text)" }}>
                    {p.title}
                  </span>
                  <span className="block truncate text-[13px]" style={{ color: "var(--wa-muted)" }}>
                    {new Date(p.startsAt).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {p.video ? " · görüntülü" : " · sesli"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    removeScheduled(p.id);
                  }}
                  className="wa-press flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ color: "var(--wa-muted)" }}
                  aria-label="Planı sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="px-4 pb-1 text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
        En Son
      </h2>
      <CallHistory onCall={onCall} />
    </div>
  );
}
