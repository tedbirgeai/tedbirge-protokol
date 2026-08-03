import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookUser,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Globe,
  Home,
  Lock,
  Mic,
  Paperclip,
  Phone,
  Pin,
  Plus,
  Reply,
  Search,
  Send,
  Smile,
  Square,
  Star,
  Trash2,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  bootChat,
  deleteMessage,
  reactToMessage,
  sendTyping,
  toggleStar,
  createGroup,
  ensureDirectConversation,
  markRead,
  removeConversation,
  requestNotificationPermission,
  sendMedia,
  sendText,
  togglePin,
  useChat,
  useConversationMessages,
} from "@/lib/chat/engine";
import { startCall } from "@/lib/call/engine";
import { acceptPairing, beginPairing, dismissPairing, usePairing } from "@/lib/chat/pairing";
import { PairingDialog } from "@/components/chat/PairingDialog";
import { getAlias, isOnboarded, setAlias } from "@/lib/chat/profile";
import { humanSize } from "@/lib/chat/media";
import {
  isSoundMuted,
  pressFeedback,
  setSoundMuted,
  unlockAudio,
  vibrate,
} from "@/lib/chat/sounds";
import { useNodeRuntime } from "@/lib/node-runtime";
import type { PeerInfo } from "@/lib/browser-node";
import { CallOverlay } from "@/components/chat/CallOverlay";
import { ContactsDialog } from "@/components/chat/ContactsDialog";
import { contactLabel, refreshContacts, useContacts } from "@/lib/chat/contacts";
import type { ChatMessage } from "@/lib/store/idb";

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","🙂","😉","😍","😘","😗","🤗","🤔",
  "😐","😴","😷","🤒","😎","🥳","😢","😭","😡","👍","👎","👏","🙏","💪","🤝","✌️",
  "❤️","💔","🔥","⭐","✅","❌","⚠️","📍","📞","📷","🎉","☕","🍽️","🚗","🏠","🔋",
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
  const tail = value.replace(/[^0-9a-z]/gi, "").slice(-4).toUpperCase();
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

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
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
  if (msg.status === "pending")
    return <Clock className="h-3.5 w-3.5" style={{ color: "var(--wa-tick)" }} aria-label="Bekliyor" />;
  if (msg.status === "read")
    return <CheckCheck className="h-4 w-4" style={{ color: "var(--wa-tick-read)" }} aria-label="Okundu" />;
  if (msg.status === "delivered")
    return <CheckCheck className="h-4 w-4" style={{ color: "var(--wa-tick)" }} aria-label="İletildi" />;
  return <Check className="h-4 w-4" style={{ color: "var(--wa-tick)" }} aria-label="Gönderildi" />;
}


/** Tek mesaj balonu — yanıt alıntısı, tepkiler ve hızlı eylemler. */
function MessageRow({
  msg,
  authorName,
  showAuthor,
  progress,
  onReply,
  onImage,
}: {
  msg: ChatMessage;
  authorName: string;
  showAuthor: boolean;
  progress?: number;
  onReply: (m: ChatMessage) => void;
  onImage: (src: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const reactions = Object.values(msg.reactions ?? {});

  function quickReact(emoji: string) {
    pressFeedback();
    void reactToMessage(msg.id, emoji);
    setMenu(false);
  }

  return (
    <div className={`group flex ${msg.outgoing ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[80%]">
        <div
          className="wa-bubble rounded-lg px-2.5 py-1.5 text-[14.5px] shadow-sm"
          style={{
            background: msg.outgoing ? "var(--wa-bubble-out)" : "var(--wa-bubble-in)",
            color: "var(--wa-text)",
          }}
          onDoubleClick={() => quickReact("👍")}
        >
          {showAuthor && !msg.outgoing && (
            <p className="mb-0.5 text-[12px] font-semibold" style={{ color: "var(--wa-accent)" }}>
              {authorName}
            </p>
          )}

          {msg.replyTo && (
            <div
              className="mb-1 rounded-md border-l-[3px] px-2 py-1 text-[12.5px]"
              style={{ borderColor: "var(--wa-accent)", background: "rgba(0,0,0,0.05)", color: "var(--wa-muted)" }}
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
          ) : msg.kind === "media" && msg.media ? (
            msg.media.mime.startsWith("image/") ? (
              <img
                src={msg.media.dataUrl}
                alt={msg.media.name}
                onClick={() => onImage(msg.media!.dataUrl)}
                className="max-h-64 cursor-zoom-in rounded-md"
              />
            ) : msg.media.mime.startsWith("audio/") ? (
              <audio controls src={msg.media.dataUrl} className="w-56" />
            ) : (
              <a href={msg.media.dataUrl} download={msg.media.name} className="underline">
                {msg.media.name} · {humanSize(msg.media.size)}
              </a>
            )
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
          )}

          <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px]" style={{ color: "var(--wa-muted)" }}>
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
              {Array.from(new Set(reactions)).slice(0, 3).map((e) => (
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
            <MenuItem
              icon={<Trash2 className="h-4 w-4" />}
              label="Sil"
              onClick={() => {
                void deleteMessage(msg.id, msg.outgoing);
                setMenu(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
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

function Onboarding({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="wa flex h-[100dvh] items-center justify-center p-6" style={{ background: "var(--wa-panel-soft)" }}>
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold" style={{ color: "var(--wa-text)" }}>
          Sohbete başlayın
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--wa-muted)" }}>
          Yalnızca görünen adınızı yazın. Telefon numarası, e-posta ya da hesap gerekmez; güvenlik anahtarlarınız
          cihazınızda otomatik oluşturulur ve hiçbir sunucuya gönderilmez.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adınız (ör. Ekin Dinç)"
          className="mt-5 w-full rounded-lg border px-4 py-3 text-sm outline-none"
          style={{ borderColor: "var(--wa-border)", color: "var(--wa-text)" }}
        />
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => {
            setAlias(name);
            void requestNotificationPermission();
            onDone();
          }}
          className="wa-press mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--wa-accent)" }}
        >
          Devam et
        </button>
      </div>
    </div>
  );
}

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
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; timer: ReturnType<typeof setInterval> } | null>(null);

  const chat = useChat();
  const node = useNodeRuntime();
  const messages = useConversationMessages(activeId);

  useEffect(() => {
    setOnboarded(isOnboarded());
    void bootChat().then(() => setReady(true));
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    setSoundOff(isSoundMuted());
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Sohbet değişince yazma alanına odaklan, yanıt/emoji durumunu sıfırla.
  useEffect(() => {
    setReplyTo(null);
    setEmojiOpen(false);
    inputRef.current?.focus();
  }, [activeId]);

  useEffect(() => {
    if (atBottom) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, activeId, atBottom]);

  useEffect(() => {
    if (activeId) void markRead(activeId);
  }, [activeId, messages.length]);

  const pairing = usePairing();
  const contactBook = useContacts();

  // Rehber, yeni eş ya da yeni sohbet göründüğünde kendini tazeler.
  useEffect(() => {
    void refreshContacts();
  }, [chat.conversations.length, node.peers?.length, pairing.trusted]);

  /** Sohbet başlığını üç katmanlı rehber adıyla gösterir. */
  const titleOf = (c: { group: boolean; title: string; members: string[] }) =>
    c.group ? c.title : contactLabel(c.members[0] ?? c.title, c.title);

  const allConversations = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const rows = q
      ? chat.conversations.filter(
          (c) => c.title.toLocaleLowerCase("tr").includes(q) || c.lastText.toLocaleLowerCase("tr").includes(q),
        )
      : chat.conversations;
    return [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastTs - a.lastTs);
  }, [chat.conversations, query]);

  // WhatsApp modeli: tek liste. Eşleşme (PIN/QR) yalnızca cihaz bağlamada.
  const conversations = allConversations;

  const active = chat.conversations.find((c) => c.id === activeId) ?? null;
  const peers: PeerInfo[] = node.peers ?? [];
  const me = getAlias() || "Ben";
  const activeName = active ? (active.group ? active.title : contactLabel(active.members[0] ?? active.title, active.title)) : "";
  const peerId = active?.members[0];
  const peerOnline = Boolean(active?.members.some((m) => peers.some((p) => p.nodeId === m)));
  const nameOf = (id: string) => contactLabel(id, chat.aliases[id]);
  const peerTyping = Boolean(activeId && Date.now() - (chat.typing[activeId] ?? 0) < 5000);

  /** Bekleyen (henüz iletilmemiş) mesaj sayısı — tek satırlık sade durum. */
  const pendingCount = useMemo(
    () => Object.values(chat.messages).flat().filter((m) => m.outgoing && m.status === "pending").length,
    [chat.messages],
  );

  function submitDraft() {
    if (!active || !draft.trim()) return;
    pressFeedback();
    void sendText(active.id, draft, replyTo
      ? {
          id: replyTo.id,
          text: replyTo.deleted ? "Silinen mesaj" : replyTo.text || replyTo.media?.name || "Ek",
          author: replyTo.outgoing ? me : displayName(active.title),
        }
      : undefined);
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
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recRef.current) clearInterval(recRef.current.timer);
        recRef.current = null;
        setRecording(false);
        setRecSecs(0);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 800) return;
        const file = new File([blob], `sesli-not-${Date.now()}.webm`, { type: blob.type });
        void sendMedia(active.id, file).catch((err: Error) => setError(err.message));
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

  if (!onboarded) return <Onboarding onDone={() => setOnboarded(true)} />;

  return (
    <div className="wa flex h-[100dvh] w-full overflow-hidden" style={{ background: "var(--wa-panel-soft)" }}>
      <CallOverlay />
      <PairingDialog nameOf={nameOf} />
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
        className={`flex h-full w-full shrink-0 flex-col md:w-[380px] ${activeId ? "hidden md:flex" : "flex"}`}
        style={{ background: "var(--wa-panel)", borderRight: "1px solid var(--wa-border)" }}
      >
        <div
          className="flex items-center gap-3 px-4 py-2.5"
          style={{ background: "var(--wa-panel-soft)", borderBottom: "1px solid var(--wa-border)" }}
        >
          <Avatar name={me} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: "var(--wa-text)" }}>
              {me}
            </p>
            <p className="truncate text-[11px]" style={{ color: "var(--wa-muted)" }}>
              {pendingCount > 0 ? `${pendingCount} mesaj bekliyor` : "Bağlı"}
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium hover:bg-black/5"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Web sitesine dön"
            title="Web sitesine dön"
          >
            <Home className="h-[18px] w-[18px]" />
            <span className="hidden sm:inline">Web sitesi</span>
          </Link>

          <Link
            to="/kurumsal"
            className="wa-press rounded-full p-2 hover:bg-black/5"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Hakkında"
            title="Hakkında"
          >
            <Globe className="h-[18px] w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setContactsOpen(true);
            }}
            className="wa-press rounded-full p-2 hover:bg-black/5"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Rehber"
            title="Rehber"
          >
            <BookUser className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !soundOff;
              setSoundMuted(next);
              setSoundOff(next);
              if (!next) pressFeedback();
            }}
            className="wa-press rounded-full p-2 hover:bg-black/5"
            style={{ color: "var(--wa-muted)" }}
            aria-label={soundOff ? "Sesleri aç" : "Sesleri kapat"}
            title={soundOff ? "Sesleri aç" : "Sesleri kapat"}
          >
            {soundOff ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setGroupMode((v) => !v);
            }}
            className="wa-press rounded-full p-2 hover:bg-black/5"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Yeni sohbet veya grup"
          >
            <Plus className="h-[18px] w-[18px]" />
          </button>
        </div>

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

        {groupMode && (
          <div className="p-4" style={{ borderTop: "1px solid var(--wa-border)", borderBottom: "1px solid var(--wa-border)" }}>
            <p className="text-xs" style={{ color: "var(--wa-muted)" }}>
              Yakındaki cihazlar otomatik listelenir. Dokunarak sohbet açabilirsiniz.
            </p>
            <div className="mt-3 space-y-2">
              {peers.length === 0 && (
                <p className="text-xs" style={{ color: "var(--wa-muted)" }}>
                  Henüz yakında cihaz yok — karekod ile davet edin.
                </p>
              )}
              {peers.map((p) => {
                const paired = Boolean(pairing.trusted[p.nodeId]);
                return (
                  <button
                    key={p.nodeId}
                    type="button"
                    onClick={() => {
                      void ensureDirectConversation(p.nodeId, chat.aliases[p.nodeId]).then((c) => {
                        setActiveId(c.id);
                        setGroupMode(false);
                      });
                    }}
                    className="wa-press wa-row flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5"
                    style={{ border: "1px solid var(--wa-border)", color: "var(--wa-text)" }}
                  >
                    <span className="truncate">{contactLabel(p.nodeId, chat.aliases[p.nodeId])}</span>
                    <span className="text-[11px]" style={{ color: paired ? "var(--wa-accent)" : "var(--wa-muted)" }}>
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
                    : createGroup(value, peers.map((p: PeerInfo) => p.nodeId));
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

        <ul className="flex-1 overflow-y-auto">
          {pairing.incoming.map((req) => (
            <li key={`req_${req.nodeId}`} className="px-4 py-3" style={{ background: "var(--wa-panel-soft)" }}>
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
            const name = titleOf(c);
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
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[15px] font-medium" style={{ color: "var(--wa-text)" }}>
                        {c.pinned && <Pin className="mr-1 inline h-3 w-3" style={{ color: "var(--wa-accent)" }} aria-hidden />}
                        {name}
                      </p>
                      <span className="shrink-0 text-[11px]" style={{ color: "var(--wa-muted)" }}>
                        {c.lastTs ? timeOf(c.lastTs) : ""}
                      </span>
                    </div>
                    <p className="truncate text-[13px]" style={{ color: "var(--wa-muted)" }}>
                      {c.lastText || "Henüz mesaj yok"}
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
          {ready && conversations.length === 0 && (
            <li className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: "var(--wa-muted)" }}>
                Henüz kimse yok. Davet linkini paylaşın — karşı taraf linke dokunduğunda sohbet açılır.
              </p>
              <button
                type="button"
                onClick={() => void shareInvite()}
                className="wa-press mt-4 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
                style={{ background: "var(--wa-accent)" }}
              >
                Davet linki paylaş
              </button>
            </li>
          )}

        </ul>

        <div
          className="flex items-center gap-2 px-4 py-2 text-[11px]"
          style={{ borderTop: "1px solid var(--wa-border)", color: "var(--wa-muted)" }}
        >
          <Lock className="h-3 w-3" aria-hidden />
          <span>{pendingCount > 0 ? `Çevrimdışı — ${pendingCount} mesaj bekliyor` : "Bağlı · uçtan uca şifreli"}</span>
        </div>
      </aside>

      {/* Sağ panel — aktif sohbet */}
      <section className={`relative flex h-full min-w-0 flex-1 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
        {!active ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center"
            style={{ background: "var(--wa-panel-soft)" }}
          >
            <p className="text-lg font-medium" style={{ color: "var(--wa-text)" }}>
              Tedbirge Mesajlaşma
            </p>
            <p className="max-w-md text-sm" style={{ color: "var(--wa-muted)" }}>
              Bir sohbet seçin. Mesajlarınız internet varken bulut üzerinden, internet yokken yakındaki cihazlar
              üzerinden iletilir — siz hiçbir ayar yapmazsınız.
            </p>
          </div>
        ) : (
          <>
            <header
              className="flex items-center gap-3 px-4 py-2"
              style={{ background: "var(--wa-panel-soft)", borderBottom: "1px solid var(--wa-border)" }}
            >
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="rounded-full p-2 hover:bg-black/5 md:hidden"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Listeye dön"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar name={activeName} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
                  {activeName}
                </p>
                <p className="truncate text-[12px]" style={{ color: "var(--wa-muted)" }}>
                  {peerTyping ? "yazıyor…" : active.group ? "Grup" : peerOnline ? "çevrimiçi" : "son görülme bilinmiyor"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  if (peerId) void startCall(peerId, false, activeName);
                }}
                disabled={active.group || !peerId}
                className="wa-press rounded-full p-2 hover:bg-black/5 disabled:opacity-40"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Sesli ara"
              >
                <Phone className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pressFeedback();
                  if (peerId) void startCall(peerId, true, activeName);
                }}
                disabled={active.group || !peerId}
                className="wa-press rounded-full p-2 hover:bg-black/5 disabled:opacity-40"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Görüntülü ara"
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => void togglePin(active.id)}
                className="wa-press rounded-full p-2 hover:bg-black/5"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Sabitle"
              >
                <Pin className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  void removeConversation(active.id);
                  setActiveId(null);
                }}
                className="wa-press rounded-full p-2 hover:bg-black/5"
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
              <div className="mx-auto mb-3 w-fit rounded-md bg-white/70 px-3 py-1 text-[11px]" style={{ color: "var(--wa-muted)" }}>
                <Lock className="mr-1 inline h-3 w-3" aria-hidden /> Mesajlar uçtan uca şifrelidir
              </div>
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay = !prev || new Date(prev.ts).toDateString() !== new Date(m.ts).toDateString();
                return (
                  <div key={m.id} className="space-y-1.5">
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
                      onReply={setReplyTo}
                      onImage={setLightbox}
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

            {error && (
              <p className="px-5 pb-2 text-xs" style={{ color: "#c0392b" }}>
                {error}
              </p>
            )}

            {replyTo && (
              <div
                className="wa-pop flex items-start gap-2 px-3 pt-2"
                style={{ background: "var(--wa-panel-soft)" }}
              >
                <div
                  className="flex-1 rounded-md border-l-[3px] px-3 py-2 text-[12.5px]"
                  style={{ borderColor: "var(--wa-accent)", background: "var(--wa-panel)", color: "var(--wa-muted)" }}
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
              className="flex items-center gap-1.5 p-2.5"
              style={{ background: "var(--wa-panel-soft)", borderTop: "1px solid var(--wa-border)" }}
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
                className="wa-press rounded-full p-2.5 hover:bg-black/5"
                style={{ color: emojiOpen ? "var(--wa-accent)" : "var(--wa-muted)" }}
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
                className="wa-press rounded-full p-2.5 hover:bg-black/5"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Dosya ekle"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              {recording ? (
                <div
                  className="flex flex-1 items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
                  style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
                >
                  <span className="wa-rec h-2.5 w-2.5 rounded-full" style={{ background: "#e03131" }} aria-hidden />
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
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
                />
              )}
              {draft.trim() ? (
                <button
                  type="submit"
                  className="wa-press rounded-full p-2.5 text-white"
                  style={{ background: "var(--wa-accent)" }}
                  aria-label="Gönder"
                >
                  <Send className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void toggleRecording()}
                  className={`wa-press rounded-full p-2.5 text-white ${recording ? "wa-ring" : ""}`}
                  style={{ background: recording ? "#e03131" : "var(--wa-accent)" }}
                  aria-label={recording ? "Kaydı bitir ve gönder" : "Sesli not kaydet"}
                >
                  {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}
            </form>

            {lightbox && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
                onClick={() => setLightbox(null)}
                role="presentation"
              >
                <img src={lightbox} alt="Büyütülmüş görsel" className="max-h-full max-w-full rounded-md" />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
