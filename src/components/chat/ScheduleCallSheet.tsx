import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { addScheduled } from "@/lib/chat/scheduled-calls";
import { pressFeedback } from "@/lib/chat/sounds";

function defaultStart(): string {
  const d = new Date(Date.now() + 60 * 60000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * ARAMA PLANLA
 * ------------------------------------------------------------------
 * Başlık, açıklama, başlangıç/bitiş, arama türü, onay ve hatırlatma.
 * Kayıt yalnızca cihazda tutulur.
 */
export function ScheduleCallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [useEnd, setUseEnd] = useState(false);
  const [endsAt, setEndsAt] = useState(defaultStart);
  const [video, setVideo] = useState(true);
  const [approval, setApproval] = useState(false);
  const [remind, setRemind] = useState(15);

  if (!open) return null;

  const save = () => {
    if (!title.trim()) {
      toast.error("Başlık girin");
      return;
    }
    pressFeedback();
    addScheduled({
      title: title.trim(),
      description: description.trim() || undefined,
      startsAt: new Date(startsAt).toISOString(),
      ...(useEnd ? { endsAt: new Date(endsAt).toISOString() } : {}),
      video,
      approval,
      remindMinutes: remind,
    });
    toast.success("Arama planlandı", { description: new Date(startsAt).toLocaleString("tr-TR") });
    setTitle("");
    setDescription("");
    onClose();
  };

  const field = {
    borderColor: "var(--wa-border)",
    color: "var(--wa-text)",
    background: "var(--wa-panel)",
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-black/45 md:items-center"
      onClick={onClose}
    >
      <div
        className="wa wa-scope box-border max-h-[88dvh] w-full max-w-[min(28rem,100vw)] overflow-y-auto overflow-x-hidden rounded-t-3xl p-4 sm:p-5 md:max-w-md pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
        style={{ background: "var(--wa-panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[18px] font-bold" style={{ color: "var(--wa-text)" }}>
            Arama planla
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

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Başlık"
          className="w-full rounded-lg border px-4 py-3 text-[15px] outline-none"
          style={field}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 2048))}
          placeholder="Açıklama (isteğe bağlı)"
          rows={3}
          className="mt-3 w-full rounded-lg border px-4 py-3 text-[15px] outline-none"
          style={field}
        />
        <p className="mt-1 text-right text-[11px]" style={{ color: "var(--wa-muted)" }}>
          {description.length}/2048
        </p>

        <label className="mt-3 block text-[12px]" style={{ color: "var(--wa-muted)" }}>
          Başlangıç
        </label>
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="mt-1 w-full rounded-lg border px-4 py-3 text-[15px] outline-none"
          style={field}
        />

        <label className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[15px]" style={{ color: "var(--wa-text)" }}>
            Bitiş saati ekle
          </span>
          <input
            type="checkbox"
            checked={useEnd}
            onChange={(e) => setUseEnd(e.target.checked)}
            className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full"
            style={{ background: useEnd ? "var(--wa-accent)" : "var(--wa-border)" }}
          />
        </label>
        {useEnd && (
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-2 w-full rounded-lg border px-4 py-3 text-[15px] outline-none"
            style={field}
          />
        )}

        <div className="mt-4 flex gap-2">
          {[
            { id: "video", label: "Görüntülü" },
            { id: "audio", label: "Sesli" },
          ].map((o) => {
            const on = (o.id === "video") === video;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setVideo(o.id === "video")}
                className="wa-press flex-1 rounded-full px-4 py-2.5 text-[14px] font-medium"
                style={{
                  background: on ? "var(--wa-accent)" : "var(--wa-panel-soft)",
                  color: on ? "#fff" : "var(--wa-text)",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <label className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[15px]" style={{ color: "var(--wa-text)" }}>
            Katılmak için onay gereksin
          </span>
          <input
            type="checkbox"
            checked={approval}
            onChange={(e) => setApproval(e.target.checked)}
            className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full"
            style={{ background: approval ? "var(--wa-accent)" : "var(--wa-border)" }}
          />
        </label>

        <label className="mt-4 block text-[12px]" style={{ color: "var(--wa-muted)" }}>
          Hatırlatma
        </label>
        <select
          value={remind}
          onChange={(e) => setRemind(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border px-4 py-3 text-[15px] outline-none"
          style={field}
        >
          <option value={0}>Kapalı</option>
          <option value={5}>5 dakika önce</option>
          <option value={15}>15 dakika önce</option>
          <option value={60}>1 saat önce</option>
        </select>

        <button
          type="button"
          onClick={save}
          className="wa-press mt-5 w-full rounded-full px-4 py-3 text-[15px] font-semibold text-white"
          style={{ background: "var(--wa-accent)" }}
        >
          Planla
        </button>
      </div>
    </div>
  );
}
