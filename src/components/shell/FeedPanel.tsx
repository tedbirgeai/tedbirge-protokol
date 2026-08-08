/**
 * TOPLULUK / SOSYAL AKIŞ EKRANI
 * ------------------------------------------------------------------
 * Sunucusuz akış: gönderi cihazda saklanır, yakındaki düğümlere
 * yayılır. Görsel/dosya eki doğrudan eşler arasında taşınır.
 */

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Send, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";

import { pressFeedback } from "@/lib/chat/sounds";
import { Avatar } from "@/components/chat/Avatar";
import {
  MAX_FEED_MEDIA_BYTES,
  bootFeed,
  deletePost,
  listPosts,
  onFeedChange,
  publishPost,
  type FeedMedia,
  type FeedPost,
} from "@/lib/social/feed";

function readFile(file: File): Promise<FeedMedia> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      resolve({
        name: file.name,
        mime: file.type || "application/octet-stream",
        dataUrl: String(r.result),
      });
    r.onerror = () => reject(r.error ?? new Error("Dosya okunamadı."));
    r.readAsDataURL(file);
  });
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FeedPanel({ meName, onTransfer }: { meName: string; onTransfer?: () => void }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<FeedMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bootFeed();
    setPosts(listPosts());
    return onFeedChange(() => setPosts(listPosts()));
  }, []);

  async function submit() {
    if (!text.trim() && !media) return;
    setBusy(true);
    try {
      await publishPost({ text, authorName: meName, ...(media ? { media } : {}) });
      setText("");
      setMedia(null);
      toast.success("Gönderi yakındaki düğümlere yayıldı.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gönderi yayılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Gönderi yazma alanı */}
      <div
        className="mx-auto w-full max-w-2xl shrink-0 p-3"
        style={{ borderBottom: "1px solid var(--wa-border)" }}
      >
        <div className="flex gap-3">
          <Avatar name={meName} size={40} />
          <div className="min-w-0 flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Toplulukla ne paylaşmak istersiniz?"
              className="w-full resize-none rounded-2xl px-3 py-2 text-[15px] outline-none"
              style={{ background: "var(--wa-panel-soft)", color: "var(--wa-text)" }}
            />
            {media && (
              <div
                className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: "var(--wa-panel-soft)" }}
              >
                <span
                  className="min-w-0 flex-1 truncate text-[13px]"
                  style={{ color: "var(--wa-muted)" }}
                >
                  {media.name}
                </span>
                <button
                  type="button"
                  aria-label="Eki kaldır"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                  onClick={() => setMedia(null)}
                >
                  <X className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />
                </button>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (f.size > MAX_FEED_MEDIA_BYTES) {
                    toast.error(
                      "Ek 320 KB sınırını aşıyor. Büyük dosyalar için Dosya aktarımını kullanın.",
                    );
                    return;
                  }
                  void readFile(f)
                    .then(setMedia)
                    .catch(() => toast.error("Dosya okunamadı."));
                }}
              />
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  fileRef.current?.click();
                }}
                className="wa-press flex h-10 min-w-11 items-center gap-2 rounded-full px-3 text-[13px]"
                style={{ background: "var(--wa-panel-soft)", color: "var(--wa-text)" }}
              >
                <ImageIcon className="h-4 w-4" /> Görsel
              </button>
              {onTransfer && (
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    onTransfer();
                  }}
                  className="wa-press h-10 rounded-full px-3 text-[13px]"
                  style={{ background: "var(--wa-panel-soft)", color: "var(--wa-text)" }}
                >
                  Büyük dosya gönder
                </button>
              )}
              <span className="flex-1" />
              <button
                type="button"
                disabled={busy || (!text.trim() && !media)}
                onClick={() => {
                  pressFeedback();
                  void submit();
                }}
                className="wa-press flex h-10 min-w-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--wa-accent)" }}
              >
                <Send className="h-4 w-4" /> Paylaş
              </button>
            </div>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span
            className="flex h-24 w-24 items-center justify-center rounded-3xl"
            style={{ background: "var(--wa-accent-soft)" }}
          >
            <Users className="h-10 w-10" style={{ color: "var(--wa-accent)" }} />
          </span>
          <h2 className="text-[20px] font-bold" style={{ color: "var(--wa-text)" }}>
            Akış sunucusuz çalışır
          </h2>
          <p className="text-[15px]" style={{ color: "var(--wa-muted)" }}>
            Yazdığınız gönderi cihazınızda kalır ve yakındaki doğrulanmış düğümlere doğrudan ulaşır.
            İnternet kesikken de paylaşabilirsiniz.
          </p>
        </div>
      ) : (
        <ul className="mx-auto w-full max-w-2xl p-3">
          {posts.map((p) => (
            <li
              key={p.id}
              className="mb-3 rounded-2xl p-3 sm:p-4"
              style={{ background: "var(--wa-panel)", border: "1px solid var(--wa-border)" }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.authorName} size={36} />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[15px] font-semibold"
                    style={{ color: "var(--wa-text)" }}
                  >
                    {p.authorName}
                    {p.mine && <span style={{ color: "var(--wa-muted)" }}> · Siz</span>}
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--wa-muted)" }}>
                    {timeLabel(p.ts)}
                  </p>
                </div>
                {p.mine && (
                  <button
                    type="button"
                    aria-label="Gönderiyi sil"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                    onClick={() => deletePost(p.id)}
                  >
                    <Trash2 className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />
                  </button>
                )}
              </div>
              {p.text && (
                <p
                  className="mt-2 whitespace-pre-wrap text-[15px]"
                  style={{ color: "var(--wa-text)" }}
                >
                  {p.text}
                </p>
              )}
              {p.media &&
                (p.media.mime.startsWith("image/") ? (
                  <img
                    src={p.media.dataUrl}
                    alt={p.media.name}
                    loading="lazy"
                    className="mt-2 max-h-80 w-full rounded-xl object-cover"
                  />
                ) : (
                  <a
                    href={p.media.dataUrl}
                    download={p.media.name}
                    className="mt-2 block truncate rounded-xl px-3 py-2 text-[14px]"
                    style={{ background: "var(--wa-panel-soft)", color: "var(--wa-accent)" }}
                  >
                    {p.media.name}
                  </a>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
