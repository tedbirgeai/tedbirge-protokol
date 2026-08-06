import { useEffect, useState } from "react";
import { Info, PhoneIncoming, PhoneMissed, PhoneOutgoing, Trash2, Video } from "lucide-react";

import { Avatar } from "@/components/chat/Avatar";
import { getAvatar, useAvatars } from "@/lib/chat/avatars";
import {
  clearCallLog,
  durationLabel,
  listCalls,
  onCallLogChange,
  type CallRecord,
} from "@/lib/chat/call-log";
import { safeNameOf, UNKNOWN_TITLE } from "@/lib/chat/safe-title";
import { pressFeedback } from "@/lib/chat/sounds";

function directionLabel(rec: CallRecord): string {
  if (rec.direction === "missed") return "Cevapsız";
  return rec.direction === "incoming" ? "Gelen" : "Giden";
}

function DirIcon({ rec }: { rec: CallRecord }) {
  if (rec.direction === "missed") return <PhoneMissed className="h-3.5 w-3.5 text-red-500" />;
  if (rec.direction === "incoming")
    return <PhoneIncoming className="h-3.5 w-3.5" style={{ color: "var(--wa-accent)" }} />;
  return <PhoneOutgoing className="h-3.5 w-3.5" style={{ color: "var(--wa-accent)" }} />;
}

function stamp(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const yest = new Date(today.getTime() - 86400000);
  if (d.toDateString() === yest.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}

/**
 * ARAMA GEÇMİŞİ — WhatsApp "En Son" listesi ölçüleriyle.
 * 56px avatar, ad, altında yön + süre, sağda tarih ve (i) düğmesi.
 * Kayıtlar yalnızca bu cihazda tutulur.
 */
export function CallHistory({
  onCall,
  onInfo,
}: {
  onCall: (peerId: string, video: boolean) => void;
  onInfo?: (peerId: string) => void;
}) {
  const [rows, setRows] = useState<CallRecord[]>([]);
  useAvatars();

  useEffect(() => {
    // Adı çözülemeyen kayıt listede hiç görünmez (hayalet satır yasağı).
    const sync = () =>
      setRows(
        listCalls().filter((r) => Boolean(r.peerId) && safeNameOf(r.peerId) !== UNKNOWN_TITLE),
      );

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
      <ul>
        {rows.map((rec) => {
          const name = safeNameOf(rec.peerId);
          const missed = rec.direction === "missed";
          return (
            <li key={rec.id} className="flex min-h-[72px] items-center gap-3 px-4">
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  onCall(rec.peerId, rec.video);
                }}
                className="wa-press flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
              >
                <Avatar name={name} src={getAvatar(rec.peerId) || undefined} size={56} />
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[17px] font-medium"
                    style={{ color: missed ? "#e03131" : "var(--wa-text)" }}
                  >
                    {name}
                  </span>
                  <span
                    className="mt-0.5 flex items-center gap-1.5 text-[13px]"
                    style={{ color: "var(--wa-muted)" }}
                  >
                    <DirIcon rec={rec} />
                    {directionLabel(rec)}
                    {!missed && ` · ${durationLabel(rec.seconds)}`}
                    {rec.video && <Video className="h-3.5 w-3.5" />}
                  </span>
                </span>
              </button>
              <span className="shrink-0 text-[13px]" style={{ color: "var(--wa-muted)" }}>
                {stamp(rec.ts)}
              </span>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  onInfo?.(rec.peerId);
                }}
                className="wa-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ color: "var(--wa-accent)" }}
                aria-label={`${name} arama bilgisi`}
              >
                <Info className="h-5 w-5" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-center px-3 py-4">
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
    </div>
  );
}
