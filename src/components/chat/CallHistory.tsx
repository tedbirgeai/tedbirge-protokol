import { useEffect, useState } from "react";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Trash2 } from "lucide-react";

import {
  clearCallLog,
  durationLabel,
  listCalls,
  onCallLogChange,
  type CallRecord,
} from "@/lib/chat/call-log";
import { safeNameOf } from "@/lib/chat/safe-title";
import { pressFeedback } from "@/lib/chat/sounds";

function icon(rec: CallRecord) {
  if (rec.direction === "missed") return <PhoneMissed className="h-4 w-4 text-red-500" />;
  if (rec.direction === "incoming")
    return <PhoneIncoming className="h-4 w-4" style={{ color: "var(--wa-accent)" }} />;
  return <PhoneOutgoing className="h-4 w-4" style={{ color: "var(--wa-accent)" }} />;
}

/**
 * ARAMA GEÇMİŞİ SEKMESİ
 * ------------------------------------------------------------------
 * Gelen / giden / cevapsız aramalar. Kayıtlar yalnızca bu cihazda tutulur.
 */
export function CallHistory({ onCall }: { onCall: (peerId: string, video: boolean) => void }) {
  const [rows, setRows] = useState<CallRecord[]>([]);

  useEffect(() => {
    const sync = () => setRows(listCalls());
    sync();
    return onCallLogChange(sync);
  }, []);

  if (rows.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm" style={{ color: "var(--wa-muted)" }}>
        Henüz arama kaydı yok.
      </p>
    );
  }

  return (
    <div>
      <div className="flex justify-end px-3 pt-2">
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            clearCallLog();
          }}
          className="wa-press flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12px]"
          style={{ color: "var(--wa-muted)" }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Geçmişi temizle
        </button>
      </div>
      <ul>
        {rows.map((rec) => (
          <li key={rec.id}>
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                onCall(rec.peerId, rec.video);
              }}
              className="wa-press flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left"
              style={{ borderBottom: "1px solid var(--wa-border)" }}
            >
              <span className="shrink-0">{icon(rec)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">
                  {safeNameOf(rec.peerId)}
                </span>
                <span className="block text-[12px]" style={{ color: "var(--wa-muted)" }}>
                  {new Date(rec.ts).toLocaleString("tr-TR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {rec.direction === "missed" ? " · cevapsız" : ` · ${durationLabel(rec.seconds)}`}
                </span>
              </span>
              {rec.video && <Video className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
