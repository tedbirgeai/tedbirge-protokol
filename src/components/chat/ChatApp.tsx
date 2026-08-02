import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Globe,
  Home,
  Lock,
  Paperclip,
  Phone,
  Pin,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import {
  bootChat,
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
import { getAlias, isOnboarded, setAlias } from "@/lib/chat/profile";
import { humanSize } from "@/lib/chat/media";
import { useNodeRuntime } from "@/lib/node-runtime";
import type { PeerInfo } from "@/lib/browser-node";
import { describeTier, useAccessTier } from "@/lib/access-tiers";
import { CallOverlay } from "@/components/chat/CallOverlay";
import type { ChatMessage } from "@/lib/store/idb";

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
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
          className="mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
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
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const chat = useChat();
  const node = useNodeRuntime();
  const access = useAccessTier();
  const tier = describeTier(access);
  const messages = useConversationMessages(activeId);

  useEffect(() => {
    setOnboarded(isOnboarded());
    void bootChat().then(() => setReady(true));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeId]);

  useEffect(() => {
    if (activeId) void markRead(activeId);
  }, [activeId, messages.length]);

  const conversations = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const rows = q
      ? chat.conversations.filter(
          (c) => c.title.toLocaleLowerCase("tr").includes(q) || c.lastText.toLocaleLowerCase("tr").includes(q),
        )
      : chat.conversations;
    return [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastTs - a.lastTs);
  }, [chat.conversations, query]);

  const active = chat.conversations.find((c) => c.id === activeId) ?? null;
  const peers: PeerInfo[] = node.peers ?? [];
  const me = getAlias() || "Ben";
  const activeName = active ? displayName(active.title) : "";
  const peerId = active?.members[0];
  const peerOnline = Boolean(active?.members.some((m) => peers.some((p) => p.nodeId === m)));

  if (!onboarded) return <Onboarding onDone={() => setOnboarded(true)} />;

  return (
    <div className="wa flex h-[100dvh] w-full overflow-hidden" style={{ background: "var(--wa-panel-soft)" }}>
      <CallOverlay />

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
              {tier.label}
            </p>
          </div>
          <Link
            to="/"
            className="rounded-full p-2 hover:bg-black/5"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Ana sayfaya dön"
            title="Ana sayfaya dön"
          >
            <Home className="h-[18px] w-[18px]" />
          </Link>
          <Link
            to="/kurumsal"
            className="rounded-full p-2 hover:bg-black/5"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Kurumsal siteye dön"
            title="Kurumsal site / mod değiştir"
          >
            <Globe className="h-[18px] w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={() => setGroupMode((v) => !v)}
            className="rounded-full p-2 hover:bg-black/5"
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
              {peers.map((p) => (
                <button
                  key={p.nodeId}
                  type="button"
                  onClick={() =>
                    void ensureDirectConversation(p.nodeId, chat.aliases[p.nodeId]).then((c) => {
                      setActiveId(c.id);
                      setGroupMode(false);
                    })
                  }
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5"
                  style={{ border: "1px solid var(--wa-border)", color: "var(--wa-text)" }}
                >
                  <span className="truncate">{displayName(p.nodeId, chat.aliases[p.nodeId])}</span>
                  <span className="text-[11px]" style={{ color: "var(--wa-accent)" }}>
                    çevrimiçi
                  </span>
                </button>
              ))}
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
          {conversations.map((c) => {
            const name = displayName(c.title);
            return (
              <li key={c.id} style={{ borderBottom: "1px solid var(--wa-border)" }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveId(c.id)}
                  onKeyDown={(e) => e.key === "Enter" && setActiveId(c.id)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.03]"
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
            <li className="px-4 py-6 text-sm" style={{ color: "var(--wa-muted)" }}>
              Sohbet yok. Artı düğmesiyle yakındaki bir cihazla konuşmaya başlayın.
            </li>
          )}
        </ul>

        <div
          className="flex items-center gap-2 px-4 py-2 text-[11px]"
          style={{ borderTop: "1px solid var(--wa-border)", color: "var(--wa-muted)" }}
        >
          <Lock className="h-3 w-3" aria-hidden />
          <span>Uçtan uca şifreli · {tier.message}</span>
        </div>
      </aside>

      {/* Sağ panel — aktif sohbet */}
      <section className={`flex h-full min-w-0 flex-1 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
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
                  {active.group ? "Grup" : peerOnline ? `çevrimiçi · ${tier.label}` : `bağlantı bekleniyor · ${tier.label}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => peerId && void startCall(peerId, false, activeName)}
                disabled={active.group || !peerId}
                className="rounded-full p-2 hover:bg-black/5 disabled:opacity-40"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Sesli ara"
              >
                <Phone className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => peerId && void startCall(peerId, true, activeName)}
                disabled={active.group || !peerId}
                className="rounded-full p-2 hover:bg-black/5 disabled:opacity-40"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Görüntülü ara"
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => void togglePin(active.id)}
                className="rounded-full p-2 hover:bg-black/5"
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
                className="rounded-full p-2 hover:bg-black/5"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Sohbeti sil"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </header>

            <div className="wa-chat-bg flex-1 space-y-1.5 overflow-y-auto px-4 py-4 md:px-12">
              <div className="mx-auto mb-3 w-fit rounded-md bg-white/70 px-3 py-1 text-[11px]" style={{ color: "var(--wa-muted)" }}>
                <Lock className="mr-1 inline h-3 w-3" aria-hidden /> Mesajlar uçtan uca şifrelidir
              </div>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.outgoing ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[78%] rounded-lg px-2.5 py-1.5 text-[14.5px] shadow-sm"
                    style={{
                      background: m.outgoing ? "var(--wa-bubble-out)" : "var(--wa-bubble-in)",
                      color: "var(--wa-text)",
                    }}
                  >
                    {m.kind === "media" && m.media ? (
                      m.media.mime.startsWith("image/") ? (
                        <img src={m.media.dataUrl} alt={m.media.name} className="max-h-64 rounded-md" />
                      ) : m.media.mime.startsWith("audio/") ? (
                        <audio controls src={m.media.dataUrl} className="w-56" />
                      ) : (
                        <a href={m.media.dataUrl} download={m.media.name} className="underline">
                          {m.media.name} · {humanSize(m.media.size)}
                        </a>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    )}
                    <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px]" style={{ color: "var(--wa-muted)" }}>
                      <span>{timeOf(m.ts)}</span>
                      <StatusIcon msg={m} />
                    </div>
                    {chat.transfers[m.id] !== undefined && (
                      <p className="mt-1 text-[11px]" style={{ color: "var(--wa-muted)" }}>
                        Aktarılıyor · %{chat.transfers[m.id]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {error && (
              <p className="px-5 pb-2 text-xs" style={{ color: "#c0392b" }}>
                {error}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                void sendText(active.id, draft);
                setDraft("");
              }}
              className="flex items-center gap-2 p-2.5"
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
                onClick={() => fileRef.current?.click()}
                className="rounded-full p-2.5 hover:bg-black/5"
                style={{ color: "var(--wa-muted)" }}
                aria-label="Dosya ekle"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Bir mesaj yazın"
                className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none"
                style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
              />
              <button
                type="submit"
                className="rounded-full p-2.5 text-white disabled:opacity-50"
                style={{ background: "var(--wa-accent)" }}
                disabled={!draft.trim()}
                aria-label="Gönder"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
