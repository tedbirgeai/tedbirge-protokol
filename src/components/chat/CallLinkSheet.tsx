import { useMemo, useState } from "react";
import { CalendarPlus, Copy, Share2, Video, Phone, X } from "lucide-react";
import { toast } from "sonner";

import { createCallLink, urlOfCallLink } from "@/lib/chat/call-links";
import { pressFeedback } from "@/lib/chat/sounds";

/**
 * YENİ ARAMA BAĞLANTISI
 * ------------------------------------------------------------------
 * Görüntülü/sesli seçimi, katılım bağlantısı, "onay gereksin"
 * anahtarı ve kopyala / paylaş / takvime ekle eylemleri.
 * Bağlantı cihazda üretilir; sunucuya kayıt yazılmaz.
 */
export function CallLinkSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [video, setVideo] = useState(true);
  const [approval, setApproval] = useState(false);

  const link = useMemo(
    () => (open ? createCallLink(video, approval) : null),
    // Yeni bağlantı yalnızca ekran açıldığında/tür değiştiğinde üretilir.
    [open, video, approval],
  );
  const url = link ? urlOfCallLink(link) : "";

  if (!open) return null;

  const copy = async () => {
    pressFeedback();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Bağlantı kopyalandı");
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  const share = async () => {
    pressFeedback();
    try {
      if (navigator.share) await navigator.share({ title: "Tedbirge araması", url });
      else await copy();
    } catch {
      /* kullanıcı iptal etti */
    }
  };

  const toCalendar = () => {
    pressFeedback();
    const start = new Date(Date.now() + 15 * 60000)
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0];
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${start}Z`,
      "SUMMARY:Tedbirge araması",
      `URL:${url}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tedbirge-arama.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-black/45 md:items-center"
      onClick={onClose}
    >
      <div
        className="wa w-full max-w-md rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
        style={{ background: "var(--wa-panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[18px] font-bold" style={{ color: "var(--wa-text)" }}>
            Yeni arama bağlantısı
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

        <div className="flex gap-2">
          {[
            { id: "video", label: "Görüntülü", icon: Video, on: video },
            { id: "audio", label: "Sesli", icon: Phone, on: !video },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                pressFeedback();
                setVideo(opt.id === "video");
              }}
              className="wa-press flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium"
              style={{
                background: opt.on ? "var(--wa-accent)" : "var(--wa-panel-soft)",
                color: opt.on ? "#fff" : "var(--wa-text)",
              }}
            >
              <opt.icon className="h-4 w-4" /> {opt.label}
            </button>
          ))}
        </div>

        <p
          className="mt-4 break-all rounded-xl px-4 py-3 text-[13px]"
          style={{ background: "var(--wa-panel-soft)", color: "var(--wa-text)" }}
        >
          {url}
        </p>

        <label className="mt-4 flex items-center justify-between gap-3">
          <span className="min-w-0 text-[15px]" style={{ color: "var(--wa-text)" }}>
            Katılmak için onay gereksin
          </span>
          <input
            type="checkbox"
            checked={approval}
            onChange={(e) => setApproval(e.target.checked)}
            className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full transition"
            style={{ background: approval ? "var(--wa-accent)" : "var(--wa-border)" }}
          />
        </label>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Action icon={<Copy className="h-5 w-5" />} label="Kopyala" onClick={() => void copy()} />
          <Action
            icon={<Share2 className="h-5 w-5" />}
            label="Paylaş"
            onClick={() => void share()}
          />
          <Action icon={<CalendarPlus className="h-5 w-5" />} label="Takvim" onClick={toCalendar} />
        </div>
      </div>
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wa-press flex flex-col items-center gap-1.5 rounded-2xl py-3"
      style={{ background: "var(--wa-panel-soft)", color: "var(--wa-text)" }}
    >
      <span style={{ color: "var(--wa-accent)" }}>{icon}</span>
      <span className="text-[12px]">{label}</span>
    </button>
  );
}
