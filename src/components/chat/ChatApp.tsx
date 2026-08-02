import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  Clock,
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
import { useNode } from "@/lib/node-runtime";
import { describeTier, useAccessTier } from "@/lib/access-tiers";
import { CallOverlay } from "@/components/chat/CallOverlay";
import type { ChatMessage } from "@/lib/store/idb";

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ msg }: { msg: ChatMessage }) {
  if (!msg.outgoing) return null;
  if (msg.status === "pending") return <Clock className="h-3.5 w-3.5 opacity-70" aria-label="Bekliyor" />;
  if (msg.status === "read") return <CheckCheck className="h-3.5 w-3.5 text-primary" aria-label="Okundu" />;
  if (msg.status === "delivered") return <CheckCheck className="h-3.5 w-3.5 opacity-70" aria-label="İletildi" />;
  return <Check className="h-3.5 w-3.5 opacity-70" aria-label="Gönderildi" />;
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="mx-auto max-w-md rounded-sm border border-border bg-card/60 p-8">
      <h2 className="text-xl font-semibold text-foreground">Sohbete başlayın</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Yalnızca görünen adınızı yazın. Telefon numarası, e-posta ya da hesap gerekmez; güvenlik anahtarlarınız
        cihazınızda otomatik oluşturulur ve hiçbir sunucuya gönderilmez.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Adınız (ör. Saha Ekibi 1)"
        className="mt-5 w-full rounded-sm border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
      />
      <button
        type="button"
        disabled={!name.trim()}
        onClick={() => {
          setAlias(name);
          void requestNotificationPermission();
          onDone();
        }}
        className="mt-4 w-full rounded-sm bg-primary px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50"
      >
        Devam et
      </button>
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
  const node = useNode();
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
  const peers = node.peers ?? [];

  if (!onboarded) return <Onboarding onDone={() => setOnboarded(true)} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <CallOverlay />

      {/* Konuşma listesi */}
      <aside className="rounded-sm border border-border bg-card/40">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {getAlias()} · {tier.label}
            </p>
            <button
              type="button"
              onClick={() => setGroupMode((v) => !v)}
              className="rounded-sm border border-border p-1.5 text-foreground hover:bg-accent"
              aria-label="Yeni sohbet veya grup"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sohbetlerde ara"
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>
        </div>

        {groupMode && (
          <div className="border-b border-border p-4">
            <p className="text-xs text-muted-foreground">
              Yakındaki cihazlar otomatik listelenir. Kimlik girmeden dokunarak sohbet açabilirsiniz.
            </p>
            <div className="mt-3 space-y-2">
              {peers.length === 0 && (
                <p className="text-xs text-muted-foreground">Henüz yakında cihaz yok — QR ile davet edin.</p>
              )}
              {peers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    void ensureDirectConversation(p.id, chat.aliases[p.id]).then((c) => {
                      setActiveId(c.id);
                      setGroupMode(false);
                    })
                  }
                  className="flex w-full items-center justify-between rounded-sm border border-border px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{chat.aliases[p.id] ?? p.id}</span>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">bağlı</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newPeer}
                onChange={(e) => setNewPeer(e.target.value)}
                placeholder="Cihaz kimliği veya grup adı"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const value = newPeer.trim();
                  if (!value) return;
                  const known = peers.some((p) => p.id === value);
                  const task = known
                    ? ensureDirectConversation(value)
                    : createGroup(value, peers.map((p) => p.id));
                  void task.then((c) => {
                    setActiveId(c.id);
                    setNewPeer("");
                    setGroupMode(false);
                  });
                }}
                className="rounded-sm bg-primary px-3 py-2 text-xs font-semibold uppercase text-primary-foreground"
              >
                <Users className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {conversations.map((c) => (
            <li key={c.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveId(c.id)}
                onKeyDown={(e) => e.key === "Enter" && setActiveId(c.id)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-accent ${
                  activeId === c.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-xs text-foreground">
                  {c.title.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.pinned && <Pin className="mr-1 inline h-3 w-3 text-primary" aria-hidden />}
                    {c.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{c.lastText || "Henüz mesaj yok"}</p>
                </div>
                {c.unread > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] text-primary-foreground">
                    {c.unread}
                  </span>
                )}
              </div>
            </li>
          ))}
          {ready && conversations.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              Sohbet yok. Artı düğmesiyle yakındaki bir cihazla konuşmaya başlayın.
            </li>
          )}
        </ul>
      </aside>

      {/* Mesaj alanı */}
      <section className="flex min-h-[70vh] flex-col rounded-sm border border-border bg-card/40">
        {!active ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center text-sm text-muted-foreground">
            Bir sohbet seçin. Mesajlarınız internet varken bulut üzerinden, internet yokken yakındaki cihazlar
            üzerinden iletilir — siz hiçbir ayar yapmazsınız.
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{active.title}</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {tier.message}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => active.members[0] && void startCall(active.members[0], false, active.title)}
                  disabled={active.group || !active.members[0]}
                  className="rounded-sm border border-border p-2 text-foreground hover:bg-accent disabled:opacity-40"
                  aria-label="Sesli ara"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => active.members[0] && void startCall(active.members[0], true, active.title)}
                  disabled={active.group || !active.members[0]}
                  className="rounded-sm border border-border p-2 text-foreground hover:bg-accent disabled:opacity-40"
                  aria-label="Görüntülü ara"
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void togglePin(active.id)}
                  className="rounded-sm border border-border p-2 text-foreground hover:bg-accent"
                  aria-label="Sabitle"
                >
                  <Pin className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void removeConversation(active.id);
                    setActiveId(null);
                  }}
                  className="rounded-sm border border-border p-2 text-foreground hover:bg-accent"
                  aria-label="Sohbeti sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.outgoing ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-sm px-3 py-2 text-sm ${
                      m.outgoing
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    {m.kind === "media" && m.media ? (
                      m.media.mime.startsWith("image/") ? (
                        <img src={m.media.dataUrl} alt={m.media.name} className="max-h-64 rounded-sm" />
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
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-80">
                      <span>{timeOf(m.ts)}</span>
                      <StatusIcon msg={m} />
                    </div>
                    {chat.transfers[m.id] !== undefined && (
                      <p className="mt-1 text-[10px]">Aktarılıyor · %{chat.transfers[m.id]}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {error && <p className="px-5 pb-2 text-xs text-destructive">{error}</p>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                void sendText(active.id, draft);
                setDraft("");
              }}
              className="flex items-center gap-2 border-t border-border p-3"
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
                className="rounded-sm border border-border p-2.5 text-foreground hover:bg-accent"
                aria-label="Dosya ekle"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Mesaj yazın"
                className="flex-1 rounded-sm border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="rounded-sm bg-primary p-2.5 text-primary-foreground disabled:opacity-50"
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
