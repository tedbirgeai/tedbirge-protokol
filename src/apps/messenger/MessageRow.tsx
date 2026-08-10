/**
 * MESSENGER UYGULAMASI — MESAJ GÖRÜNÜMÜ PARÇALARI
 * ------------------------------------------------------------------
 * Faz A: kabuk (shell) ile uygulama ayrımı. Bu dosya yalnız mesajlaşma
 * uygulamasına ait sunum parçalarını taşır; kabuk kodu bunları bilmez.
 * Mantık aynen taşınmıştır, davranış değişmemiştir.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Image as ImageIcon,

  Forward,
  Languages,
  MapPin,
  Pencil,
  Pin,
  Reply,
  RotateCw,
  Siren,
  Star,
  Trash2,
} from "lucide-react";

import {
  canDeleteForEveryone,
  canEdit,
  deleteMessage,
  EDIT_WINDOW_MS,
  pinMessage,
  reactToMessage,
  remainingWindow,
  retryMessage,
  toggleStar,
} from "@/lib/chat/engine";
import { cachedTranslation, translateText } from "@/lib/chat/translate";
import { geoUri } from "@/lib/chat/location";
import { humanSize } from "@/lib/chat/media";
import { pressFeedback } from "@/lib/chat/sounds";
import type { ChatMessage } from "@/lib/store/idb";

export function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "🙂",
  "😉",
  "😍",
  "😘",
  "😗",
  "🤗",
  "🤔",
  "😐",
  "😴",
  "😷",
  "🤒",
  "😎",
  "🥳",
  "😢",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🤝",
  "✌️",
  "❤️",
  "💔",
  "🔥",
  "⭐",
  "✅",
  "❌",
  "⚠️",
  "📍",
  "📞",
  "📷",
  "🎉",
  "☕",
  "🍽️",
  "🚗",
  "🏠",
  "🔋",
];

/** Gün ayırıcı etiketi — bugün / dün / tarih. */
export function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Bugün";
  if (same(d, yest)) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Ham cihaz kimliklerini gizler; kullanıcıya okunabilir bir ad gösterir. */
export function displayName(value: string, alias?: string) {
  if (alias && alias.trim()) return alias;
  const looksLikeId = /^[a-z]{2,6}-[0-9a-f]{6,}$/i.test(value) || /^[0-9a-f-]{16,}$/i.test(value);
  if (!looksLikeId) return value;
  const tail = value
    .replace(/[^0-9a-z]/gi, "")
    .slice(-4)
    .toUpperCase();
  return `Cihaz ${tail}`;
}

/* Avatar ve baş harf yardımcıları ortak bileşene taşındı:
   `@/components/chat/Avatar` (Avatar, initials, avatarColor). */

function StatusIcon({ msg }: { msg: ChatMessage }) {
  if (!msg.outgoing) return null;
  if (msg.status === "failed")
    return (
      <button
        type="button"
        className="wa-press inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ background: "var(--wa-panel)", color: "var(--destructive)" }}
        onClick={() => void retryMessage(msg.id)}
        aria-label="İletilemedi — yeniden dene"
      >
        <RotateCw className="h-3.5 w-3.5" />
        iletilemedi · yeniden dene
      </button>
    );
  if (msg.status === "pending")
    return (
      <Clock
        className="h-3.5 w-3.5"
        style={{ color: "var(--wa-tick)" }}
        aria-label="Bekliyor — bağlantı gelince gönderilecek"
      />
    );
  if (msg.status === "read")
    return (
      <CheckCheck
        className="h-4 w-4"
        style={{ color: "var(--wa-tick-read)" }}
        aria-label="Okundu"
      />
    );
  if (msg.status === "delivered")
    return (
      <CheckCheck className="h-4 w-4" style={{ color: "var(--wa-tick)" }} aria-label="İletildi" />
    );
  return (
    <Check
      className="h-4 w-4"
      style={{ color: "var(--wa-tick)" }}
      aria-label="Röle üzerinden gönderildi"
    />
  );
}

/** Tek mesaj balonu — yanıt alıntısı, tepkiler ve hızlı eylemler. */
export function MessageRow({
  msg,
  authorName,
  showAuthor,
  progress,
  pinned,
  translateTo,
  onReply,
  onImage,
  onEdit,
  onForward,
}: {
  msg: ChatMessage;
  authorName: string;
  showAuthor: boolean;
  progress?: number;
  pinned?: boolean;
  translateTo?: string;
  onReply: (m: ChatMessage) => void;
  onImage: (src: string) => void;
  onEdit: (m: ChatMessage) => void;
  onForward: (m: ChatMessage) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const reactions = Object.values(msg.reactions ?? {});

  // Otomatik çeviri: yalnızca gelen metin mesajları, cihazda önbelleklenir.
  useEffect(() => {
    setTranslated(null);
    const text = msg.text?.trim();
    if (!translateTo || msg.outgoing || msg.deleted || !text) return;
    const hit = cachedTranslation(text, translateTo);
    if (hit) {
      setTranslated(hit);
      return;
    }
    let alive = true;
    void translateText(text, translateTo).then((r) => {
      if (alive && !r.error && r.text && r.text !== text) setTranslated(r.text);
    });
    return () => {
      alive = false;
    };
  }, [msg.id, msg.text, msg.outgoing, msg.deleted, translateTo]);

  function quickReact(emoji: string) {
    pressFeedback();
    void reactToMessage(msg.id, emoji);
    setMenu(false);
  }

  // WhatsApp davranışı: uzun basma veya sağ tık eylem menüsünü açar.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenu = () => {
    pressFeedback();
    setMenu(true);
  };
  const holdStart = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(openMenu, 420);
  };
  const holdEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  useEffect(() => holdEnd, []);

  const media = msg.media;

  async function saveMedia() {
    if (!media) return;
    const a = document.createElement("a");
    a.href = media.dataUrl;
    a.download = media.name || "tedbirge-dosya";
    a.click();
    setMenu(false);
  }

  async function copyMedia() {
    if (!media) return;
    try {
      const blob = await (await fetch(media.dataUrl)).blob();
      const Item = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (Item && navigator.clipboard?.write) {
        await navigator.clipboard.write([new Item({ [blob.type]: blob })]);
      }
    } catch {
      /* pano erişimi yok */
    }
    setMenu(false);
  }

  const isSos = msg.kind === "sos";

  return (
    <div className={`group flex ${msg.outgoing ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[80%]">
        <div
          className="wa-bubble select-none rounded-lg px-2.5 py-1.5 text-[14.5px] shadow-sm"
          style={{
            background: isSos
              ? "#fff0f0"
              : msg.outgoing
                ? "var(--wa-bubble-out)"
                : "var(--wa-bubble-in)",
            color: "var(--wa-text)",
            border: isSos ? "1px solid #e03131" : undefined,
          }}
          onDoubleClick={() => quickReact("👍")}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenu();
          }}
          onPointerDown={holdStart}
          onPointerUp={holdEnd}
          onPointerLeave={holdEnd}
          onPointerCancel={holdEnd}
        >

          {showAuthor && !msg.outgoing && (
            <p className="mb-0.5 text-[12px] font-semibold" style={{ color: "var(--wa-accent)" }}>
              {authorName}
            </p>
          )}

          {(msg.forwarded || pinned) && (
            <p
              className="mb-0.5 flex items-center gap-1 text-[11px] italic"
              style={{ color: "var(--wa-muted)" }}
            >
              {msg.forwarded && (
                <>
                  <Forward className="h-3 w-3" aria-hidden />
                  İletildi{msg.forwardedFrom ? ` · ${msg.forwardedFrom}` : ""}
                </>
              )}
              {pinned && (
                <>
                  <Pin className="h-3 w-3" aria-hidden /> Sabitlenmiş
                </>
              )}
            </p>
          )}

          {msg.replyTo && (
            <div
              className="mb-1 rounded-md border-l-[3px] px-2 py-1 text-[12.5px]"
              style={{
                borderColor: "var(--wa-accent)",
                background: "rgba(0,0,0,0.05)",
                color: "var(--wa-muted)",
              }}
            >
              <span className="block font-semibold" style={{ color: "var(--wa-accent)" }}>
                {msg.replyTo.author}
              </span>
              <span className="line-clamp-2 break-words">{msg.replyTo.text || "Ek"}</span>
            </div>
          )}

          {msg.deleted ? (
            <p className="italic" style={{ color: "var(--wa-muted)" }}>
              Bu mesaj silindi
            </p>
          ) : msg.geo ? (
            <div>
              {isSos && (
                <p
                  className="mb-1 flex items-center gap-1 text-[13px] font-bold"
                  style={{ color: "#e03131" }}
                >
                  <Siren className="h-4 w-4" aria-hidden /> ACİL DURUM YAYINI
                </p>
              )}
              {msg.geo.frame && (
                <img
                  src={msg.geo.frame}
                  alt="Çevrimdışı konum haritası"
                  onClick={() => onImage(msg.geo!.frame!)}
                  className="mb-1 max-h-56 cursor-zoom-in rounded-md"
                />
              )}
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              {msg.geo.note && (
                <p className="mt-0.5 text-[13px]" style={{ color: "var(--wa-muted)" }}>
                  {msg.geo.note}
                </p>
              )}
              {typeof msg.geo.battery === "number" && (
                <p className="mt-0.5 text-[12px]" style={{ color: "var(--wa-muted)" }}>
                  🔋 %{Math.round(msg.geo.battery)}
                  {msg.geo.charging ? " · şarjda" : ""}
                </p>
              )}
              <a
                href={geoUri({ lat: msg.geo.lat, lon: msg.geo.lon, ts: msg.ts })}
                className="mt-1 inline-flex items-center gap-1 text-[12px] underline"
                style={{ color: "var(--wa-accent)" }}
              >
                <MapPin className="h-3 w-3" aria-hidden /> Harita uygulamasında aç
              </a>
            </div>
          ) : msg.kind === "media" && msg.media ? (
            msg.media.mime.startsWith("image/") ? (
              <img
                src={msg.media.dataUrl}
                alt={msg.media.name}
                onClick={() => onImage(msg.media!.dataUrl)}
                className="max-h-64 cursor-zoom-in rounded-md"
              />
            ) : msg.media.mime.startsWith("audio/") ? (
              <div>
                <audio controls src={msg.media.dataUrl} className="w-56" />
                {msg.transcript && (
                  <p className="mt-1 text-[12.5px] italic" style={{ color: "var(--wa-muted)" }}>
                    “{msg.transcript}”
                  </p>
                )}
              </div>
            ) : (
              <a href={msg.media.dataUrl} download={msg.media.name} className="underline">
                {msg.media.name} · {humanSize(msg.media.size)}
              </a>
            )
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          )}

          {translated && (
            <p
              className="mt-1 flex items-start gap-1 border-t pt-1 text-[13px]"
              style={{ borderColor: "var(--wa-border)", color: "var(--wa-muted)" }}
            >
              <Languages className="mt-[3px] h-3 w-3 shrink-0" aria-hidden />
              <span className="whitespace-pre-wrap break-words">{translated}</span>
            </p>
          )}

          <div
            className="mt-0.5 flex items-center justify-end gap-1 text-[11px]"
            style={{ color: "var(--wa-muted)" }}
          >
            {msg.editedAt && <span>düzenlendi</span>}
            {msg.starred && <Star className="h-3 w-3 fill-current" aria-label="Yıldızlı" />}
            <span>{timeOf(msg.ts)}</span>
            <StatusIcon msg={msg} />
          </div>

          {progress !== undefined && (
            <p className="mt-1 text-[11px]" style={{ color: "var(--wa-muted)" }}>
              Aktarılıyor · %{progress}
            </p>
          )}

          {reactions.length > 0 && (
            <div
              className="wa-pop absolute -bottom-3 right-2 flex items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[12px] shadow"
              aria-label="Tepkiler"
            >
              {Array.from(new Set(reactions))
                .slice(0, 3)
                .map((e) => (
                  <span key={e}>{e}</span>
                ))}
              {reactions.length > 1 && (
                <span className="text-[10px]" style={{ color: "var(--wa-muted)" }}>
                  {reactions.length}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hızlı eylemler */}
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            setMenu((v) => !v);
          }}
          className={`wa-press absolute top-1 ${msg.outgoing ? "-left-7" : "-right-7"} rounded-full p-1 opacity-0 group-hover:opacity-100 focus:opacity-100`}
          style={{ color: "var(--wa-muted)" }}
          aria-label="Mesaj seçenekleri"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        {menu && (
          <div
            className="wa-pop absolute z-20 mt-1 w-max rounded-xl bg-white p-1.5 shadow-lg"
            style={{ [msg.outgoing ? "right" : "left"]: 0, top: "100%" }}
          >
            <div className="flex gap-1 px-1 pb-1.5">
              {QUICK_REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => quickReact(e)}
                  className="wa-press rounded-full px-1 text-lg"
                  aria-label={`Tepki ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <MenuItem
              icon={<Reply className="h-4 w-4" />}
              label="Yanıtla"
              onClick={() => {
                onReply(msg);
                setMenu(false);
              }}
            />
            {!msg.deleted && (
              <MenuItem
                icon={<Forward className="h-4 w-4" />}
                label="İlet / alıntılı ilet"
                onClick={() => {
                  onForward(msg);
                  setMenu(false);
                }}
              />
            )}
            {msg.outgoing && msg.kind === "text" && canEdit(msg) && (
              <MenuItem
                icon={<Pencil className="h-4 w-4" />}
                label={`Düzenle (${remainingWindow(msg, EDIT_WINDOW_MS)})`}
                onClick={() => {
                  onEdit(msg);
                  setMenu(false);
                }}
              />
            )}
            {!msg.deleted && (
              <MenuItem
                icon={<Pin className="h-4 w-4" />}
                label={pinned ? "Sabitlemeyi kaldır" : "Sohbete sabitle"}
                onClick={() => {
                  void pinMessage(msg.convId, pinned ? null : msg.id);
                  setMenu(false);
                }}
              />
            )}
            {msg.kind === "text" && !msg.deleted && (
              <MenuItem
                icon={<Copy className="h-4 w-4" />}
                label="Kopyala"
                onClick={() => {
                  void navigator.clipboard.writeText(msg.text).catch(() => undefined);
                  setMenu(false);
                }}
              />
            )}
            {media && !msg.deleted && (
              <>
                <MenuItem
                  icon={<Download className="h-4 w-4" />}
                  label={media.mime.startsWith("image/") ? "Fotoğraflara kaydet" : "Dosyayı kaydet"}
                  onClick={() => void saveMedia()}
                />
                {media.mime.startsWith("image/") && (
                  <>
                    <MenuItem
                      icon={<Copy className="h-4 w-4" />}
                      label="Resmi kopyala"
                      onClick={() => void copyMedia()}
                    />
                    <MenuItem
                      icon={<ImageIcon className="h-4 w-4" />}
                      label="Resmi aç"
                      onClick={() => {
                        onImage(media.dataUrl);
                        setMenu(false);
                      }}
                    />
                  </>
                )}
              </>
            )}

            <MenuItem
              icon={<Star className="h-4 w-4" />}
              label={msg.starred ? "Yıldızı kaldır" : "Yıldızla"}
              onClick={() => {
                void toggleStar(msg.id);
                setMenu(false);
              }}
            />
            {canDeleteForEveryone(msg) && (
              <MenuItem
                icon={<Trash2 className="h-4 w-4" />}
                label="Herkesten sil"
                onClick={() => {
                  void deleteMessage(msg.id, true);
                  setMenu(false);
                }}
              />
            )}
            <MenuItem
              icon={<Trash2 className="h-4 w-4" />}
              label="Bende sil"
              onClick={() => {
                void deleteMessage(msg.id, false);
                setMenu(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        pressFeedback();
        onClick();
      }}
      className="wa-press flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-black/5"
      style={{ color: "var(--wa-text)" }}
    >
      {icon}
      {label}
    </button>
  );
}
