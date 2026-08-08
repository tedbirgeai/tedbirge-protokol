import { useMemo, useState } from "react";
import { X, Image as ImageIcon, Film, FileText } from "lucide-react";

import { useConversationMessages } from "@/lib/chat/engine";
import { humanSize } from "@/lib/chat/media";
import { pressFeedback } from "@/lib/chat/sounds";

type Tab = "foto" | "video" | "belge";

const TABS: { id: Tab; label: string }[] = [
  { id: "foto", label: "Fotoğraf" },
  { id: "video", label: "Video" },
  { id: "belge", label: "Belge" },
];

/**
 * SOHBET İÇİ MEDYA GALERİSİ
 * ------------------------------------------------------------------
 * Fotoğraf / video / belge sekmeli ızgara. Tüm içerik cihazdaki şifreli
 * depodan okunur; hiçbir dosya sunucuya gönderilmez.
 */
export function MediaGallery({
  open,
  convId,
  title,
  onClose,
}: {
  open: boolean;
  convId: string | null;
  title: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("foto");
  const messages = useConversationMessages(open ? convId : null);

  const items = useMemo(() => {
    const media = messages.filter((m) => m.kind === "media" && m.media && !m.deleted);
    return media.filter((m) => {
      const mime = m.media?.mime ?? "";
      if (tab === "foto") return mime.startsWith("image/");
      if (tab === "video") return mime.startsWith("video/");
      return !mime.startsWith("image/") && !mime.startsWith("video/");
    });
  }, [messages, tab]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="wa-scope flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl shadow-xl"
        style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--wa-border)" }}
        >
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">Medya ve belgeler</h2>
            <p className="truncate text-xs" style={{ color: "var(--wa-muted)" }}>
              {title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="wa-press rounded-full p-2"
            aria-label="Galeriyi kapat"
          >
            <X className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />
          </button>
        </div>

        <div className="flex gap-1.5 px-5 pt-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                pressFeedback();
                setTab(t.id);
              }}
              className="wa-press min-h-9 rounded-full px-3 py-1.5 text-[12px] font-semibold"
              style={{
                border: "1px solid var(--wa-border)",
                background: tab === t.id ? "var(--wa-accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--wa-muted)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 && (
            <p className="py-10 text-center text-sm" style={{ color: "var(--wa-muted)" }}>
              Bu sohbette henüz {tab === "foto" ? "fotoğraf" : tab === "video" ? "video" : "belge"}{" "}
              yok.
            </p>
          )}

          {tab === "belge" ? (
            <ul className="space-y-2">
              {items.map((m) => (
                <li key={m.id}>
                  <a
                    href={m.media?.dataUrl}
                    download={m.media?.name}
                    className="wa-press flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{ border: "1px solid var(--wa-border)" }}
                  >
                    <FileText className="h-5 w-5 shrink-0" style={{ color: "var(--wa-accent)" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {m.media?.name}
                      </span>
                      <span className="block text-[11px]" style={{ color: "var(--wa-muted)" }}>
                        {humanSize(m.media?.size ?? 0)} ·{" "}
                        {new Date(m.ts).toLocaleDateString("tr-TR")}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {items.map((m) => (
                <li key={m.id}>
                  {tab === "foto" ? (
                    <a
                      href={m.media?.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="wa-press block aspect-square w-full overflow-hidden rounded-lg"
                    >
                      <img
                        src={m.media?.dataUrl}
                        alt={`Paylaşılan fotoğraf · ${new Date(m.ts).toLocaleDateString("tr-TR")}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ) : (
                    <video
                      src={m.media?.dataUrl}
                      controls
                      playsInline
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p
          className="flex items-center gap-2 px-5 py-3 text-[11px]"
          style={{ borderTop: "1px solid var(--wa-border)", color: "var(--wa-muted)" }}
        >
          {tab === "video" ? (
            <Film className="h-3 w-3" aria-hidden />
          ) : (
            <ImageIcon className="h-3 w-3" aria-hidden />
          )}
          Tüm dosyalar yalnızca bu cihazda şifreli olarak saklanır.
        </p>
      </div>
    </div>
  );
}
