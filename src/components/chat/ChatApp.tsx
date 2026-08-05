import { SyncWarningBar } from "@/components/chat/SyncStatusPanel";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  Archive,
  ArrowLeft,
  BookUser,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Forward,
  Globe,
  Home,
  Languages,
  Lock,
  MapPin,
  Mic,
  Paperclip,
  Pencil,
  Phone,
  Pin,
  Plus,
  Reply,
  Search,
  Send,
  Siren,
  Smile,
  Square,
  Star,
  Trash2,
  Settings,
  Radio,
  RotateCw,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
  Bell,
  BellOff,
  Image as ImageIcon,
} from "lucide-react";
import {
  bootChat,
  canDeleteForEveryone,
  canEdit,
  deleteMessage,
  editMessage,
  pinMessage,
  reactToMessage,
  remainingWindow,
  sendTyping,
  sendVoiceFile,
  toggleStar,
  createGroup,
  ensureDirectConversation,
  ensureSelfConversation,
  SELF_CONV_ID,
  markRead,
  removeConversation,
  conversationTargets,
  sendMedia,
  sendText,
  togglePin,
  useChat,
  useConversationMessages,
  EDIT_WINDOW_MS,
  retryMessage,
  directConvId,
} from "@/lib/chat/engine";
import { bootCalls, startCall, startConference } from "@/lib/call/engine";
import { CallHistory } from "@/components/chat/CallHistory";
import { MediaGallery } from "@/components/chat/MediaGallery";
import { lastSeenLabel } from "@/lib/chat/last-seen";
import { AppLockScreen, ChatSettingsDialog, SearchPanel } from "@/components/chat/ChatTools";
import { ForwardDialog } from "@/components/chat/ForwardDialog";
import { EmergencyDialog } from "@/components/chat/EmergencyDialog";
import { bootLock, useLock } from "@/lib/chat/lock";
import { startPtt, stopPtt } from "@/lib/chat/ptt";
import { ttlOf, ttlLabel } from "@/lib/chat/ephemeral";
import {
  ARCHIVE,
  folderOf,
  folderTabs,
  getFolders,
  isArchived,
  onFoldersChange,
  toggleArchive,
} from "@/lib/chat/folders";
import { getPrivacy, onPrivacyChange } from "@/lib/chat/privacy";
import { cachedTranslation, translateText } from "@/lib/chat/translate";
import { startTranscript, type TranscriptSession } from "@/lib/chat/transcribe";
import { geoUri } from "@/lib/chat/location";
import { acceptPairing, beginPairing, dismissPairing, usePairing } from "@/lib/chat/pairing";
import { PairingDialog } from "@/components/chat/PairingDialog";
import { getAlias, isOnboarded } from "@/lib/chat/profile";
import { PhoneOnboarding } from "@/components/chat/PhoneOnboarding";
import { humanSize } from "@/lib/chat/media";
import {
  isSoundMuted,
  pressFeedback,
  setSoundMuted,
  unlockAudio,
  vibrate,
} from "@/lib/chat/sounds";
import { useNodeRuntime } from "@/lib/node-runtime";
import { getBrowserNodeId, getPersonId, type PeerInfo } from "@/lib/browser-node";
import { listCalls } from "@/lib/chat/call-log";
import { ContactsDialog } from "@/components/chat/ContactsDialog";
import { DirectoryPanel } from "@/components/chat/DirectoryPanel";
import { contactLabel, refreshContacts, useContacts } from "@/lib/chat/contacts";
import {
  fileToAvatarDataUrl,
  getAvatar,
  getMyAvatar,
  setMyAvatar,
  useAvatars,
} from "@/lib/chat/avatars";

import { humanName, isTechnicalLabel } from "@/lib/chat/display-name";
import { isNamed, safeTitleOf, UNKNOWN_TITLE } from "@/lib/chat/safe-title";
import { getDraft, setDraft as persistDraft } from "@/lib/chat/drafts";
import { bootLeader } from "@/lib/chat/leader";
import { bootSessions } from "@/lib/chat/sessions";
import {
  MUTE_OPTIONS,
  isMuted,
  muteConversation,
  muteUntilLabel,
  onMuteChange,
  unmuteConversation,
} from "@/lib/chat/mute";
import { IDB_BLOCKED_EVENT } from "@/lib/store/idb";

import type { ChatMessage, Conversation } from "@/lib/store/idb";

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const EMOJIS = [
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
function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Bugün";
  if (same(d, yest)) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Ham cihaz kimliklerini gizler; kullanıcıya okunabilir bir ad gösterir. */
function displayName(value: string, alias?: string) {
  if (alias && alias.trim()) return alias;
  const looksLikeId = /^[a-z]{2,6}-[0-9a-f]{6,}$/i.test(value) || /^[0-9a-f-]{16,}$/i.test(value);
  if (!looksLikeId) return value;
  const tail = value
    .replace(/[^0-9a-z]/gi, "")
    .slice(-4)
    .toUpperCase();
  return `Cihaz ${tail}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Ada göre sabit, okunabilir avatar rengi. */
const AVATAR_COLORS = ["#0a7cff", "#00a884", "#e0736d", "#7f66ff", "#f2a33c", "#0fb2c4", "#c2599a"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 9973;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

function Avatar({ name, size = 44, src }: { name: string; size?: number; src?: string }) {
  if (src)
    return (
      <img
        src={src}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}

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
function MessageRow({
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

  const isSos = msg.kind === "sos";

  return (
    <div className={`group flex ${msg.outgoing ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[80%]">
        <div
          className="wa-bubble rounded-lg px-2.5 py-1.5 text-[14.5px] shadow-sm"
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

function MenuItem({
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

const CALLS_TAB = "__calls";

export function ChatApp() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [newPeer, setNewPeer] = useState("");
  const [groupMode, setGroupMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [soundOff, setSoundOff] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ptt, setPtt] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [folder, setFolder] = useState<string>("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [muteMenu, setMuteMenu] = useState(false);
  const [folderVersion, setFolderVersion] = useState(0);
  const [privacy, setPrivacyState] = useState(() => getPrivacy());
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<TranscriptSession | null>(null);
  const recRef = useRef<{
    rec: MediaRecorder;
    chunks: Blob[];
    timer: ReturnType<typeof setInterval>;
  } | null>(null);

  const lock = useLock();
  const chat = useChat();
  const node = useNodeRuntime();
  const messages = useConversationMessages(activeId);

  // Klasör ve gizlilik tercihleri değişince liste ve çeviri anında yenilenir.
  useEffect(() => {
    const offFolders = onFoldersChange(() => setFolderVersion((v) => v + 1));
    const offPrivacy = onPrivacyChange(() => setPrivacyState({ ...getPrivacy() }));
    return () => {
      offFolders();
      offPrivacy();
    };
  }, []);

  useEffect(() => {
    setOnboarded(isOnboarded());
    // Aynı telefon numarasıyla açılan her tarayıcı aynı kimliğe bağlanır:
    // etkin oturum varsa katılım ekranı tekrar sorulmaz.
    void (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        const sessionPhone = data.session?.user?.phone;
        if (!sessionPhone) return;
        const { getAlias: readAlias, setAlias, setPhone } = await import("@/lib/chat/profile");
        const e164 = sessionPhone.startsWith("+") ? sessionPhone : `+${sessionPhone}`;
        setPhone(e164);
        setAlias(readAlias() || e164);
        setOnboarded(true);
      } catch {
        /* çevrimdışı: yerel kimlik kullanılır */
      }
    })();
    void bootChat().then(() => {
      setReady(true);
      bootSessions();
    });
    bootLeader();
    const onBlocked = () =>
      toast.warning("Tedbirge başka bir sekmede açık", {
        description: "Güncellemenin tamamlanması için diğer sekmeyi kapatın.",
      });
    window.addEventListener(IDB_BLOCKED_EVENT, onBlocked);
    // Gelen aramaların duyulabilmesi için sinyal dinleyicisi açılışta kurulur.
    bootCalls();
    bootLock();
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    setSoundOff(isSoundMuted());
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener(IDB_BLOCKED_EVENT, onBlocked);
    };
  }, []);

  // QR bağlantısı (…/chat?p=<kimlik>&k=<anahtar>) ile gelen kişiyi rehbere ekler.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get("p");
    const k = q.get("k");
    if (!p || !k) return;
    void (async () => {
      const { importPeerFromQr } = await import("@/lib/peer-trust");
      await importPeerFromQr(p, k);
      await refreshContacts();
      toast.success("Kişi rehbere eklendi", { description: p });
      const url = new URL(window.location.href);
      url.searchParams.delete("p");
      url.searchParams.delete("k");
      window.history.replaceState(null, "", url.pathname + url.search);
    })();
  }, []);

  // Sohbet değişince yazma alanına odaklan, yanıt/emoji durumunu sıfırla.
  useEffect(() => {
    setReplyTo(null);
    setEmojiOpen(false);
    setVisibleCount(60);
    setDraft(getDraft(activeId));
    inputRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    if (atBottom) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, activeId, atBottom]);

  useEffect(() => {
    if (activeId) void markRead(activeId);
  }, [activeId, messages.length]);

  // Taslak kalıcıdır: sohbetten çıkılsa da yazılan metin kaybolmaz.
  useEffect(() => {
    persistDraft(activeId, draft);
  }, [draft, activeId]);

  // Sessize alma değişince liste rozetleri tazelenir.
  useEffect(() => onMuteChange(() => setFolderVersion((v) => v + 1)), []);

  const pairing = usePairing();
  const contactBook = useContacts();
  useAvatars();
  const myAvatarInput = useRef<HTMLInputElement>(null);

  // Rehber, yeni eş ya da yeni sohbet göründüğünde kendini tazeler.
  useEffect(() => {
    void refreshContacts();
  }, [chat.conversations.length, node.peers?.length, pairing.trusted]);

  /** Sohbet başlığını üç katmanlı rehber adıyla gösterir. */
  const titleOf = (c: { group: boolean; title: string; members: string[] }) => safeTitleOf(c);

  const allConversations = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const rows = q
      ? chat.conversations.filter(
          (c) =>
            c.title.toLocaleLowerCase("tr").includes(q) ||
            c.lastText.toLocaleLowerCase("tr").includes(q),
        )
      : chat.conversations;
    return [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastTs - a.lastTs);
  }, [chat.conversations, query]);

  // Klasör görünümü: "" → arşivlenmemiş tümü, ARCHIVE → arşiv, diğer → klasör.
  const tabs = useMemo(() => folderTabs(), [folderVersion]);
  // Arama kaydı olan sohbetler mesajsız olsa da listede kalır.
  const callTouched = useMemo(() => {
    const set = new Set<string>();
    for (const rec of listCalls()) {
      if (rec.convId) set.add(rec.convId);
      if (rec.peerId) set.add(directConvId(getBrowserNodeId(), rec.peerId));
    }
    return set;
  }, [chat.conversations]);
  const conversations = useMemo(
    () =>
      allConversations.filter((c) => {
        const f = folderOf(c.id);
        if (folder === "" ? f === ARCHIVE : f !== folder) return false;
        if (c.id === SELF_CONV_ID) return true;
        // Boş sohbet listeye girmez: en az bir mesaj ya da arama kaydı şart.
        const hasActivity = Boolean(c.lastText) || c.unread > 0;
        if (!hasActivity && !callTouched.has(c.id)) return false;
        // Adı çözülemeyen kayıt hiç oluşturulmaz.
        if (!isNamed(c)) return false;
        return true;
      }),
    [allConversations, folder, folderVersion, callTouched],
  );

  const archivedCount = useMemo(
    () => allConversations.filter((c) => isArchived(c.id)).length,
    [allConversations, folderVersion],
  );

  const active = chat.conversations.find((c) => c.id === activeId) ?? null;
  const peers: PeerInfo[] = node.peers ?? [];
  const me = getAlias() || "Ben";
  const activeName = active
    ? active.group
      ? active.title
      : humanName(contactLabel(active.members[0] ?? active.title, active.title), UNKNOWN_TITLE)
    : "";
  // Mükerrer sohbetler birleştirildiğinde üyelerde eski cihaz kimlikleri de
  // bulunabilir. Aramada önce gerçekten bağlı cihazı, yoksa en son öğrenilen
  // kimliği seç; listenin ilk (eski) kaydına körlemesine arama yapma.
  const peerId = active
    ? (active.members.find((member) => peers.some((peer) => peer.nodeId === member)) ??
      active.members.at(-1))
    : undefined;
  const peerOnline = Boolean(active?.members.some((m) => peers.some((p) => p.nodeId === m)));
  /** Çevrim içi / son görülme yalnızca rehberde eşleşmiş kişilerde gösterilir. */
  const peerKnown = Boolean(
    active && !active.group && !isTechnicalLabel(contactLabel(active.members[0] ?? "", "")),
  );
  const nameOf = (id: string) => humanName(contactLabel(id, chat.aliases[id]), UNKNOWN_TITLE);

  const peerTyping = Boolean(activeId && Date.now() - (chat.typing[activeId] ?? 0) < 5000);
  /** Kayan pencere: çok uzun sohbetlerde yalnızca son N mesaj DOM'a basılır. */
  const shownMessages = useMemo(
    () =>
      messages.length > visibleCount ? messages.slice(messages.length - visibleCount) : messages,
    [messages, visibleCount],
  );
  const hiddenCount = messages.length - shownMessages.length;
  const activeTtl = activeId ? ttlOf(activeId) : 0;

  /** Bekleyen (henüz iletilmemiş) mesaj sayısı — tek satırlık sade durum. */
  const pendingCount = useMemo(
    () =>
      Object.values(chat.messages)
        .flat()
        .filter((m) => m.outgoing && m.status === "pending").length,
    [chat.messages],
  );

  /** Bas-konuş: basılı tutulduğu sürece canlı telsiz akışı gönderilir. */
  async function pttDown() {
    if (!active || ptt) return;
    const targets = await conversationTargets(active.id);
    const ok = await startPtt(active.id, targets);
    if (!ok) return setError("Mikrofona erişilemedi. Tarayıcı izinlerini kontrol edin.");
    setPtt(true);
  }

  async function pttUp() {
    if (!active || !ptt) return;
    setPtt(false);
    const targets = await conversationTargets(active.id);
    const file = await stopPtt(active.id, targets);
    if (file) void sendMedia(active.id, file).catch((err: Error) => setError(err.message));
  }

  function submitDraft() {
    if (!active || !draft.trim()) return;
    pressFeedback();
    // Düzenleme modunda mesaj yerinde güncellenir, yeni mesaj oluşmaz.
    if (editing) {
      const target = editing;
      const text = draft;
      setDraft("");
      setEditing(null);
      void editMessage(target.id, text).catch((err: Error) => setError(err.message));
      inputRef.current?.focus();
      return;
    }
    const message = draft;
    void sendText(
      active.id,
      message,
      replyTo
        ? {
            id: replyTo.id,
            text: replyTo.deleted ? "Silinen mesaj" : replyTo.text || replyTo.media?.name || "Ek",
            author: replyTo.outgoing ? me : displayName(active.title),
          }
        : undefined,
    ).catch((err: Error) => {
      setError(err.message || "Mesaj gönderilemedi. Yeniden deneyin.");
      setDraft((current) => current || message);
    });
    setDraft("");
    setReplyTo(null);
    setEmojiOpen(false);
    void sendTyping(active.id, false);
    inputRef.current?.focus();
  }

  /** Sesli not — basılı tutmadan tek dokunuşla başlat/bitir. */
  async function toggleRecording() {
    if (!active) return;
    pressFeedback();
    if (recRef.current) {
      recRef.current.rec.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      // Transkript kayıtla eş zamanlı, tamamen cihazda üretilir.
      transcriptRef.current = startTranscript("tr-TR");
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recRef.current) clearInterval(recRef.current.timer);
        recRef.current = null;
        setRecording(false);
        setRecSecs(0);
        const session = transcriptRef.current;
        transcriptRef.current = null;
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 800) {
          void session?.stop();
          return;
        }
        const file = new File([blob], `sesli-not-${Date.now()}.webm`, { type: blob.type });
        const finish = session ? session.stop() : Promise.resolve("");
        void finish
          .catch(() => "")
          .then((text) => sendVoiceFile(active.id, file, text?.trim() || undefined))
          .catch((err: Error) => setError(err.message));
      };
      const timer = setInterval(() => setRecSecs((v) => v + 1), 1000);
      recRef.current = { rec, chunks, timer };
      rec.start();
      setRecording(true);
      vibrate(20);
    } catch {
      setError("Mikrofona erişilemedi. Tarayıcı izinlerini kontrol edin.");
    }
  }

  async function shareInvite() {
    const url = `${window.location.origin}/chat`;
    const text = `Tedbirge ile bana yazın: ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: "Tedbirge", text, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* kullanıcı iptal etti */
    }
  }

  if (lock.locked) return <AppLockScreen onUnlocked={() => undefined} />;
  if (!onboarded) return <PhoneOnboarding onDone={() => setOnboarded(true)} />;

  return (
    <div
      className="wa flex h-[100dvh] w-full overflow-hidden"
      style={{ background: "var(--wa-panel-soft)" }}
    >
      <PairingDialog nameOf={nameOf} />
      <ForwardDialog
        message={forwardMsg}
        conversations={chat.conversations as Conversation[]}
        titleOf={titleOf}
        authorName={forwardMsg?.outgoing ? me : nameOf(forwardMsg?.from ?? "")}
        onClose={() => setForwardMsg(null)}
      />
      <MediaGallery
        open={galleryOpen}
        convId={activeId}
        title={active ? titleOf(active) : ""}
        onClose={() => setGalleryOpen(false)}
      />
      <EmergencyDialog
        open={emergencyOpen}
        convId={activeId}
        onClose={() => setEmergencyOpen(false)}
      />

      <ChatSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        convId={activeId}
      />
      <ContactsDialog
        open={contactsOpen}
        onOpenChange={setContactsOpen}
        onOpenChat={(pid) => {
          void ensureDirectConversation(pid, chat.aliases[pid]).then((c) => {
            setActiveId(c.id);
            setContactsOpen(false);
          });
        }}
      />

      {/* Sol panel — profil, arama, konuşma listesi */}
      <aside
        className={`relative flex h-full w-full shrink-0 flex-col md:w-[380px] ${activeId ? "hidden md:flex" : "flex"}`}
        style={{ background: "var(--wa-panel)", borderRight: "1px solid var(--wa-border)" }}
      >
        <SearchPanel
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onOpenMessage={(convId, messageId) => {
            setActiveId(convId);
            setSearchOpen(false);
            setVisibleCount(5000);
            setHighlightId(messageId);
            setTimeout(() => {
              document.getElementById(`msg_${messageId}`)?.scrollIntoView({ block: "center" });
            }, 250);
          }}
        />
        <div
          className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4"
          style={{
            background: "var(--wa-panel-soft)",
            borderBottom: "1px solid var(--wa-border)",
            paddingTop: "calc(0.625rem + env(safe-area-inset-top))",
          }}
        >

          <button
            type="button"
            onClick={() => myAvatarInput.current?.click()}
            className="wa-press rounded-full"
            aria-label="Profil fotoğrafını değiştir"
            title="Profil fotoğrafını değiştir"
          >
            <Avatar name={me} size={40} src={getMyAvatar()} />
          </button>
          <input
            ref={myAvatarInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void fileToAvatarDataUrl(file)
                .then((url) => setMyAvatar(url))
                .catch(() => undefined);
            }}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--wa-text)" }}>
              {me}
            </p>
            <p className="truncate text-[11px]" style={{ color: "var(--wa-muted)" }}>
              {pendingCount > 0 ? `${pendingCount} mesaj bekliyor` : `${getPersonId()} · Bağlı`}
            </p>
          </div>
          <div className="order-last flex w-full items-center justify-between gap-1 border-t pt-2 sm:order-none sm:w-auto sm:justify-end sm:border-0 sm:pt-0" style={{ borderColor: "var(--wa-border)" }}>
          <Link
            to="/"
            className="flex h-12 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-medium hover:bg-black/5 sm:h-9"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Web sitesine dön"
            title="Web sitesine dön"
          >
            <Home className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
            <span className="hidden sm:inline">Web sitesi</span>
          </Link>

          <Link
            to="/kurumsal"
            className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Hakkında"
            title="Hakkında"
          >
            <Globe className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setSearchOpen(true);
            }}
            className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Mesajlarda ara"
            title="Mesajlarda ara"
          >
            <Search className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setSettingsOpen(true);
            }}
            className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Gizlilik ve yedekleme"
            title="Gizlilik ve yedekleme"
          >
            <Settings className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setContactsOpen(true);
            }}
            className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Rehber"
            title={`Rehber · ${contactBook.contacts.length} kişi`}
          >
            <BookUser className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !soundOff;
              setSoundMuted(next);
              setSoundOff(next);
              if (!next) pressFeedback();
            }}
            className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
            style={{ color: "var(--wa-muted)" }}
            aria-label={soundOff ? "Sesleri aç" : "Sesleri kapat"}
            title={soundOff ? "Sesleri aç" : "Sesleri kapat"}
          >
            {soundOff ? (
              <VolumeX className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
            ) : (
              <Volume2 className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setGroupMode((v) => !v);
            }}
            className="wa-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-black/5 sm:h-9 sm:w-9"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Yeni sohbet veya grup"
          >
            <Plus className="h-6 w-6 sm:h-[18px] sm:w-[18px]" />
          </button>
          </div>
        </div>

        {/* "Uygulamayı yükle" Ayarlar > Hakkında bölümüne taşındı. */}

        <div className="px-3 py-2">
          <div
            className="flex items-center gap-3 rounded-lg px-3 py-2"
            style={{ background: "var(--wa-panel-soft)" }}
          >
            <Search className="h-4 w-4" style={{ color: "var(--wa-muted)" }} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara veya yeni sohbet başlat"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: "var(--wa-text)" }}
            />
          </div>
        </div>

        {/* Klasör ve arşiv sekmeleri */}
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
          {tabs.map((t) => {
            const on = folder === t.id;
            const isArchive = t.id === ARCHIVE;
            if (isArchive && archivedCount === 0 && !on) return null;
            return (
              <button
                key={t.id || "all"}
                type="button"
                onClick={() => {
                  pressFeedback();
                  setFolder(t.id);
                }}
                className="wa-press shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
                style={{
                  background: on ? "var(--wa-accent)" : "var(--wa-panel-soft)",
                  color: on ? "#fff" : "var(--wa-muted)",
                }}
              >
                {isArchive ? `Arşiv${archivedCount ? ` · ${archivedCount}` : ""}` : t.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setFolder(CALLS_TAB);
            }}
            className="wa-press shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
            style={{
              background: folder === CALLS_TAB ? "var(--wa-accent)" : "var(--wa-panel-soft)",
              color: folder === CALLS_TAB ? "#fff" : "var(--wa-muted)",
            }}
          >
            Aramalar
          </button>
        </div>

        {groupMode && (
          <div
            className="p-4"
            style={{
              borderTop: "1px solid var(--wa-border)",
              borderBottom: "1px solid var(--wa-border)",
            }}
          >
            <p className="text-xs" style={{ color: "var(--wa-muted)" }}>
              Yakındaki cihazlar otomatik listelenir. Dokunarak sohbet açabilirsiniz.
            </p>
            <div className="mt-3 space-y-2">
              {peers.length === 0 && (
                <p className="text-xs" style={{ color: "var(--wa-muted)" }}>
                  Henüz yakında cihaz yok — karekod ile davet edin.
                </p>
              )}
              {peers
                .filter((p) => !isTechnicalLabel(contactLabel(p.nodeId, chat.aliases[p.nodeId])))
                .map((p) => {
                  const paired = Boolean(pairing.trusted[p.nodeId]);

                  return (
                    <button
                      key={p.nodeId}
                      type="button"
                      onClick={() => {
                        void ensureDirectConversation(p.nodeId, chat.aliases[p.nodeId]).then(
                          (c) => {
                            setActiveId(c.id);
                            setGroupMode(false);
                          },
                        );
                      }}
                      className="wa-press wa-row flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5"
                      style={{ border: "1px solid var(--wa-border)", color: "var(--wa-text)" }}
                    >
                      <span className="truncate">
                        {humanName(
                          contactLabel(p.nodeId, chat.aliases[p.nodeId]),
                          "Kayıtsız cihaz",
                        )}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: paired ? "var(--wa-accent)" : "var(--wa-muted)" }}
                      >
                        {paired ? "çevrimiçi" : "yakında"}
                      </span>
                    </button>
                  );
                })}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newPeer}
                onChange={(e) => setNewPeer(e.target.value)}
                placeholder="Grup adı veya davet kodu"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--wa-border)", color: "var(--wa-text)" }}
              />
              <button
                type="button"
                onClick={() => {
                  const value = newPeer.trim();
                  if (!value) return;
                  const known = peers.some((p) => p.nodeId === value);
                  const task = known
                    ? ensureDirectConversation(value)
                    : createGroup(
                        value,
                        peers.map((p: PeerInfo) => p.nodeId),
                      );
                  void task.then((c) => {
                    setActiveId(c.id);
                    setNewPeer("");
                    setGroupMode(false);
                  });
                }}
                className="rounded-lg px-3 py-2 text-white"
                style={{ background: "var(--wa-accent)" }}
                aria-label="Grup oluştur"
              >
                <Users className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {folder === CALLS_TAB && (
          <div className="flex-1 overflow-y-auto">
            <CallHistory
              onCall={(peer, video) => {
                void ensureDirectConversation(peer).then((c) => {
                  setActiveId(c.id);
                  void startCall(peer, video, nameOf(peer));
                });
              }}
            />
          </div>
        )}

        <SyncWarningBar />

        <ul className={`flex-1 overflow-y-auto ${folder === CALLS_TAB ? "hidden" : ""}`}>

          {pairing.incoming.map((req) => (
            <li
              key={`req_${req.nodeId}`}
              className="px-4 py-3"
              style={{ background: "var(--wa-panel-soft)" }}
            >
              <p className="text-[13px] font-medium" style={{ color: "var(--wa-text)" }}>
                {nameOf(req.nodeId)} cihazını hesabınıza bağlamak istiyor
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => acceptPairing(req.nodeId, chat.aliases[req.nodeId])}
                  className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
                  style={{ background: "var(--wa-accent)" }}
                >
                  Kod gir
                </button>
                <button
                  type="button"
                  onClick={() => dismissPairing(req.nodeId)}
                  className="rounded-full px-3 py-1.5 text-[12px]"
                  style={{ border: "1px solid var(--wa-border)", color: "var(--wa-muted)" }}
                >
                  Yoksay
                </button>
              </div>
            </li>
          ))}
          {conversations.map((c) => {
            const name = humanName(titleOf(c));
            return (
              <li key={c.id} style={{ borderBottom: "1px solid var(--wa-border)" }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveId(c.id)}
                  onKeyDown={(e) => e.key === "Enter" && setActiveId(c.id)}
                  className="wa-row flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-black/[0.03]"
                  style={activeId === c.id ? { background: "var(--wa-panel-soft)" } : undefined}
                >
                  <Avatar name={name} src={c.group ? undefined : getAvatar(c.members[0])} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className="truncate text-[15px] font-medium"
                        style={{ color: "var(--wa-text)" }}
                      >
                        {c.pinned && (
                          <Pin
                            className="mr-1 inline h-3 w-3"
                            style={{ color: "var(--wa-accent)" }}
                            aria-hidden
                          />
                        )}
                        {name}
                        {isMuted(c.id) && (
                          <VolumeX
                            className="ml-1 inline h-3 w-3"
                            style={{ color: "var(--wa-muted)" }}
                            aria-hidden
                          />
                        )}
                      </p>
                      <span className="shrink-0 text-[11px]" style={{ color: "var(--wa-muted)" }}>
                        {c.lastTs ? timeOf(c.lastTs) : ""}
                      </span>
                    </div>
                    <p className="truncate text-[13px]" style={{ color: "var(--wa-muted)" }}>
                      {c.lastText}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                      style={{ background: "var(--wa-accent)" }}
                    >
                      {c.unread}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {ready && (
            <li>
              <DirectoryPanel
                query={query}
                peers={peers}
                labelOf={nameOf}
                onOpenPeer={(pid, name) => {
                  void ensureDirectConversation(pid, name ?? chat.aliases[pid]).then((c) =>
                    setActiveId(c.id),
                  );
                }}
                onOpenSelfNote={() => {
                  void ensureSelfConversation(`${me} (Siz)`).then((c) => setActiveId(c.id));
                }}
                onShareInvite={() => void shareInvite()}
              />
            </li>
          )}
        </ul>

        <div
          className="flex items-center gap-2 px-4 py-2 text-[11px]"
          style={{ borderTop: "1px solid var(--wa-border)", color: "var(--wa-muted)" }}
        >
          <Lock className="h-3 w-3" aria-hidden />
          <span>
            {pendingCount > 0
              ? `Çevrimdışı — ${pendingCount} mesaj bekliyor`
              : "Bağlı · uçtan uca şifreli"}
          </span>
        </div>
      </aside>

      {/* Sağ panel — aktif sohbet */}
      <section
        className={`relative flex h-full min-w-0 flex-1 flex-col ${activeId ? "flex" : "hidden md:flex"}`}
      >
        {!active ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center"
            style={{ background: "var(--wa-panel-soft)" }}
          >
            <p className="text-lg font-medium" style={{ color: "var(--wa-text)" }}>
              Tedbirge Mesajlaşma
            </p>
            <p className="max-w-md text-sm" style={{ color: "var(--wa-muted)" }}>
              Bir sohbet seçin. Mesajlarınız internet varken bulut üzerinden, internet yokken
              yakındaki cihazlar üzerinden iletilir — siz hiçbir ayar yapmazsınız.
            </p>

            {/* Son sohbetler ve arşiv kısayolu */}
            {conversations.length > 0 && (
              <div className="w-full max-w-md text-left">
                <p
                  className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--wa-muted)" }}
                >
                  Son sohbetler
                </p>
                <ul className="overflow-hidden rounded-xl" style={{ background: "var(--wa-panel)" }}>
                  {conversations.slice(0, 5).map((c) => (
                    <li key={`recent_${c.id}`} style={{ borderBottom: "1px solid var(--wa-border)" }}>
                      <button
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className="wa-press flex w-full items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <Avatar name={titleOf(c)} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">
                            {titleOf(c)}
                          </span>
                          <span
                            className="block truncate text-[12px]"
                            style={{ color: "var(--wa-muted)" }}
                          >
                            {c.lastText}
                          </span>
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--wa-muted)" }}>
                          {c.lastTs ? timeOf(c.lastTs) : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {archivedCount > 0 && (
              <button
                type="button"
                onClick={() => setFolder(ARCHIVE)}
                className="wa-press min-h-11 rounded-full px-4 py-2 text-[13px] font-semibold"
                style={{ border: "1px solid var(--wa-border)", color: "var(--wa-muted)" }}
              >
                Arşiv · {archivedCount}
              </button>
            )}
          </div>
        ) : (
          <>
            <header
              className="grid min-h-16 grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4"
              style={{
                background: "var(--wa-panel-soft)",
                borderBottom: "1px solid var(--wa-border)",
                paddingTop: "calc(0.5rem + env(safe-area-inset-top))",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="wa-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 md:hidden"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Listeye dön"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar name={activeName} size={44} src={getAvatar(peerId)} />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[15px] font-semibold"
                  style={{ color: "var(--wa-text)" }}
                >
                  {activeName}
                </p>
                <p className="truncate text-[12px]" style={{ color: "var(--wa-muted)" }}>
                  {activeTtl > 0 ? `⏱ ${ttlLabel(activeTtl)} · ` : ""}
                  {peerTyping
                    ? "yazıyor…"
                    : active.group
                      ? "Grup"
                      : !peerKnown
                        ? "uçtan uca şifreli"
                        : peerOnline
                          ? "çevrimiçi"
                          : privacy.hideLastSeen
                            ? "uçtan uca şifreli"
                            : lastSeenLabel(peerId ?? "")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  if (active.group)
                    void startConference(
                      active.members.map((m) => ({ peerId: m, alias: nameOf(m) })),
                      false,
                      activeName,
                    );
                  else if (peerId) void startCall(peerId, false, activeName);
                }}
                disabled={!peerId}
                className="wa-press flex h-13 w-13 shrink-0 items-center justify-center rounded-full border disabled:opacity-40"
                style={{ color: "var(--wa-accent)", background: "var(--wa-panel)", borderColor: "var(--wa-border)" }}
                aria-label="Sesli ara"
              >
                <Phone className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  if (active.group)
                    void startConference(
                      active.members.map((m) => ({ peerId: m, alias: nameOf(m) })),
                      true,
                      activeName,
                    );
                  else if (peerId) void startCall(peerId, true, activeName);
                }}
                disabled={!peerId}
                className="wa-press flex h-13 w-13 shrink-0 items-center justify-center rounded-full border disabled:opacity-40"
                style={{ color: "var(--wa-accent)", background: "var(--wa-panel)", borderColor: "var(--wa-border)" }}
                aria-label="Görüntülü ara"
              >
                <Video className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setGalleryOpen(true);
                }}
                className="wa-press hidden h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 lg:flex"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Medya ve belgeler"
                title="Medya ve belgeler"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => {
                    pressFeedback();
                    setMuteMenu((v) => !v);
                  }}
                  className="wa-press flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5"
                  style={{ color: isMuted(active.id) ? "var(--wa-accent)" : "var(--wa-muted)" }}
                  aria-label={isMuted(active.id) ? "Sesi aç" : "Sessize al"}
                  title={isMuted(active.id) ? muteUntilLabel(active.id) : "Sessize al"}
                >
                  {isMuted(active.id) ? (
                    <BellOff className="h-5 w-5" />
                  ) : (
                    <Bell className="h-5 w-5" />
                  )}
                </button>
                {muteMenu && (
                  <div
                    className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-lg shadow-lg"
                    style={{ background: "var(--wa-panel)", border: "1px solid var(--wa-border)" }}
                  >
                    {isMuted(active.id) ? (
                      <button
                        type="button"
                        onClick={() => {
                          unmuteConversation(active.id);
                          setMuteMenu(false);
                        }}
                        className="wa-press block w-full px-3 py-2.5 text-left text-[13px]"
                        style={{ color: "var(--wa-text)" }}
                      >
                        Bildirimleri aç
                      </button>
                    ) : (
                      MUTE_OPTIONS.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            muteConversation(active.id, o.id);
                            setMuteMenu(false);
                          }}
                          className="wa-press block w-full px-3 py-2.5 text-left text-[13px]"
                          style={{ color: "var(--wa-text)" }}
                        >
                          {o.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void togglePin(active.id)}
                className="wa-press hidden h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 lg:flex"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Sabitle"
              >
                <Pin className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  toggleArchive(active.id);
                  setActiveId(null);
                }}
                className="wa-press hidden h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 lg:flex"
                style={{ color: "var(--wa-muted)" }}
                aria-label={isArchived(active.id) ? "Arşivden çıkar" : "Arşivle"}
                title={isArchived(active.id) ? "Arşivden çıkar" : "Arşivle"}
              >
                <Archive className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  void removeConversation(active.id);
                  setActiveId(null);
                }}
                className="wa-press hidden h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 lg:flex"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Sohbeti sil"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </header>

            <div
              ref={scrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
              }}
              className="wa-chat-bg relative flex-1 space-y-1.5 overflow-y-auto px-4 py-4 md:px-12"
            >
              <div
                className="mx-auto mb-3 w-fit rounded-md bg-white/70 px-3 py-1 text-[11px]"
                style={{ color: "var(--wa-muted)" }}
              >
                <Lock className="mr-1 inline h-3 w-3" aria-hidden /> Mesajlar uçtan uca şifrelidir
              </div>
              {/* Sabitlenmiş mesaj şeridi */}
              {active.pinnedMessageId &&
                (() => {
                  const pm = messages.find((x) => x.id === active.pinnedMessageId);
                  if (!pm) return null;
                  return (
                    <div
                      className="sticky top-0 z-10 mx-auto mb-2 flex w-full max-w-2xl items-center gap-2 rounded-lg bg-white/90 px-3 py-2 shadow-sm"
                      style={{ borderLeft: "3px solid var(--wa-accent)" }}
                    >
                      <Pin
                        className="h-3.5 w-3.5"
                        style={{ color: "var(--wa-accent)" }}
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setHighlightId(pm.id);
                          document
                            .getElementById(`msg_${pm.id}`)
                            ?.scrollIntoView({ block: "center", behavior: "smooth" });
                        }}
                        className="min-w-0 flex-1 truncate text-left text-[12.5px]"
                        style={{ color: "var(--wa-text)" }}
                      >
                        {pm.text || pm.media?.name || "Ek"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void pinMessage(active.id, null)}
                        className="wa-press rounded-full p-1"
                        style={{ color: "var(--wa-muted)" }}
                        aria-label="Sabitlemeyi kaldır"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })()}

              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => v + 200)}
                  className="wa-press mx-auto block rounded-full bg-white/80 px-4 py-1.5 text-[12px]"
                  style={{ color: "var(--wa-muted)" }}
                >
                  {hiddenCount} eski mesajı yükle
                </button>
              )}
              {shownMessages.map((m, i) => {
                const prev = shownMessages[i - 1];
                const newDay =
                  !prev || new Date(prev.ts).toDateString() !== new Date(m.ts).toDateString();
                return (
                  <div
                    key={m.id}
                    id={`msg_${m.id}`}
                    className={`space-y-1.5 ${highlightId === m.id ? "rounded-lg ring-2 ring-offset-2" : ""}`}
                    style={
                      highlightId === m.id ? { boxShadow: "0 0 0 2px var(--wa-accent)" } : undefined
                    }
                  >
                    {newDay && (
                      <div
                        className="mx-auto w-fit rounded-md bg-white/80 px-3 py-1 text-[11px] font-medium"
                        style={{ color: "var(--wa-muted)" }}
                      >
                        {dayLabel(m.ts)}
                      </div>
                    )}
                    <MessageRow
                      msg={m}
                      authorName={nameOf(m.from)}
                      showAuthor={Boolean(active.group)}
                      progress={chat.transfers[m.id]}
                      pinned={active.pinnedMessageId === m.id}
                      translateTo={privacy.autoTranslateTo || undefined}
                      onReply={setReplyTo}
                      onImage={setLightbox}
                      onEdit={(msg) => {
                        setEditing(msg);
                        setReplyTo(null);
                        setDraft(msg.text);
                        inputRef.current?.focus();
                      }}
                      onForward={setForwardMsg}
                    />
                  </div>
                );
              })}
              {peerTyping && (
                <div className="flex justify-start">
                  <div
                    className="wa-bubble rounded-lg px-3 py-2 shadow-sm"
                    style={{ background: "var(--wa-bubble-in)", color: "var(--wa-muted)" }}
                  >
                    <span className="wa-typing inline-flex items-center">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {!atBottom && (
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setAtBottom(true);
                  endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                }}
                className="wa-press absolute bottom-24 right-6 z-10 rounded-full bg-white p-2.5 shadow-lg"
                style={{ color: "var(--wa-muted)" }}
                aria-label="En alta git"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            )}

            {ptt && (
              <p className="px-5 pb-1 text-xs font-semibold" style={{ color: "#e03131" }}>
                Telsiz açık — konuşun, bıraktığınızda kayıt sohbete düşer.
              </p>
            )}
            {error && (
              <p className="px-5 pb-2 text-xs" style={{ color: "#c0392b" }}>
                {error}
              </p>
            )}

            {editing && (
              <div
                className="wa-pop flex items-center gap-2 px-3 pt-2"
                style={{ background: "var(--wa-panel-soft)" }}
              >
                <div
                  className="flex-1 rounded-md border-l-[3px] px-3 py-2 text-[12.5px]"
                  style={{
                    borderColor: "var(--wa-accent)",
                    background: "var(--wa-panel)",
                    color: "var(--wa-muted)",
                  }}
                >
                  <span className="block font-semibold" style={{ color: "var(--wa-accent)" }}>
                    Mesajı düzenle · {remainingWindow(editing, EDIT_WINDOW_MS)}
                  </span>
                  <span className="line-clamp-1 break-words">{editing.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setDraft("");
                  }}
                  className="wa-press rounded-full p-2 hover:bg-black/5"
                  style={{ color: "var(--wa-muted)" }}
                  aria-label="Düzenlemeyi iptal et"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {replyTo && (
              <div
                className="wa-pop flex items-start gap-2 px-3 pt-2"
                style={{ background: "var(--wa-panel-soft)" }}
              >
                <div
                  className="flex-1 rounded-md border-l-[3px] px-3 py-2 text-[12.5px]"
                  style={{
                    borderColor: "var(--wa-accent)",
                    background: "var(--wa-panel)",
                    color: "var(--wa-muted)",
                  }}
                >
                  <span className="block font-semibold" style={{ color: "var(--wa-accent)" }}>
                    {replyTo.outgoing ? me : activeName}
                  </span>
                  <span className="line-clamp-1 break-words">
                    {replyTo.text || replyTo.media?.name || "Ek"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="wa-press rounded-full p-2 hover:bg-black/5"
                  style={{ color: "var(--wa-muted)" }}
                  aria-label="Yanıtı iptal et"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {emojiOpen && (
              <div
                className="wa-pop grid max-h-44 grid-cols-8 gap-1 overflow-y-auto px-3 pt-2 sm:grid-cols-12"
                style={{ background: "var(--wa-panel-soft)" }}
              >
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      vibrate(8);
                      setDraft((d) => d + e);
                      inputRef.current?.focus();
                    }}
                    className="wa-press rounded-md py-1 text-xl hover:bg-black/5"
                    aria-label={`Emoji ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitDraft();
              }}
              className="flex w-full max-w-full flex-wrap items-center justify-between gap-1.5 overflow-x-hidden p-2 sm:flex-nowrap sm:gap-2 sm:p-2.5"
              style={{
                background: "var(--wa-panel-soft)",
                borderTop: "1px solid var(--wa-border)",
                boxSizing: "border-box",
                paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
              }}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setError(null);
                  void sendMedia(active.id, file).catch((err: Error) => setError(err.message));
                }}
              />
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setEmojiOpen((v) => !v);
                }}
                className="wa-press order-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border sm:order-none"
                style={{ color: emojiOpen ? "var(--wa-accent)" : "var(--wa-muted)", background: "var(--wa-panel)", borderColor: "var(--wa-border)" }}
                aria-label="Emoji ekle"
              >
                <Smile className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  fileRef.current?.click();
                }}
                className="wa-press order-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border sm:order-none"
                style={{ color: "var(--wa-muted)", background: "var(--wa-panel)", borderColor: "var(--wa-border)" }}
                aria-label="Dosya ekle"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  setEmergencyOpen(true);
                }}
                className="wa-press order-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border sm:order-none"
                style={{ color: "#e03131", background: "var(--wa-panel)", borderColor: "var(--wa-border)" }}
                aria-label="Konum paylaş veya acil durum yayını"
                title="Konum paylaş · Acil durum yayını (SOS)"
              >
                <Siren className="h-5 w-5" />
              </button>

              {recording ? (
                <div
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-sm sm:px-4"
                  style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
                >
                  <span
                    className="wa-rec h-2.5 w-2.5 rounded-full"
                    style={{ background: "#e03131" }}
                    aria-hidden
                  />
                  <span>
                    Ses kaydediliyor · {String(Math.floor(recSecs / 60)).padStart(2, "0")}:
                    {String(recSecs % 60).padStart(2, "0")}
                  </span>
                </div>
              ) : (
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (active) void sendTyping(active.id, e.target.value.length > 0);
                  }}
                  placeholder="Bir mesaj yazın"
                  className="order-1 h-12 w-full min-w-0 rounded-lg px-3 text-base outline-none sm:order-none sm:flex-1 sm:px-4 sm:text-sm"
                  style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
                />
              )}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  void pttDown();
                }}
                onPointerUp={() => void pttUp()}
                onPointerLeave={() => void pttUp()}
                onPointerCancel={() => void pttUp()}
                className={`wa-press order-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border sm:order-none ${ptt ? "wa-ring text-white" : ""}`}
                style={{
                  color: ptt ? "#fff" : "var(--wa-muted)",
                  background: ptt ? "#e03131" : "var(--wa-panel)",
                  borderColor: "var(--wa-border)",
                }}
                aria-label="Bas-konuş (telsiz)"
                title="Basılı tutun — telsiz gibi konuşun"
              >
                <Radio className="h-5 w-5" />
              </button>
              {draft.trim() ? (
                <button
                  type="submit"
                  className="wa-press order-6 flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-white sm:order-none"
                  style={{ background: "var(--wa-accent)" }}
                  aria-label="Gönder"
                >
                  <Send className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void toggleRecording()}
                  className={`wa-press order-6 flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-white sm:order-none ${recording ? "wa-ring" : ""}`}
                  style={{ background: recording ? "#e03131" : "var(--wa-accent)" }}
                  aria-label={recording ? "Kaydı bitir ve gönder" : "Sesli not kaydet"}
                >
                  {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              )}
            </form>

            {lightbox && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
                onClick={() => setLightbox(null)}
                role="presentation"
              >
                <img
                  src={lightbox}
                  alt="Büyütülmüş görsel"
                  className="max-h-full max-w-full rounded-md"
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
