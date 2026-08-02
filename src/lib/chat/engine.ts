/**
 * Sohbet motoru (Katman A "WhatsApp modu" + Katman B/C mesh).
 * ------------------------------------------------------------------
 * Tüm mesajlar cihazda IndexedDB'de kalıcıdır ve mesh üzerinden
 * uçtan uca şifreli gider. Alıcı çevrimdışıysa mesaj sakla-ilet
 * kuyruğunda bekler, bağlantı gelince otomatik teslim edilir.
 * Grup sohbetlerinde mesaj her üyeye ayrı şifreli zarfla dağıtılır;
 * grup anahtarı hiçbir sunucuya çıkmaz.
 */

import { useSyncExternalStore } from "react";
import {
  getConversation,
  listAllMessages,
  listConversations,
  listMessages,
  putConversation,
  putMessage,
  deleteConversation as idbDeleteConversation,
  getMessage,
  type ChatMessage,
  type Conversation,
  type MessageStatus,
} from "@/lib/store/idb";
import { knownPeerIds, sendMesh, startNode } from "@/lib/node-runtime";
import { bootMeshBus, onMesh } from "@/lib/mesh-bus";
import { getAlias } from "@/lib/chat/profile";
import { collectChunk, fileToDataUrl, isMediaChunk, splitMedia, MAX_MEDIA_BYTES } from "@/lib/chat/media";
import { digestsOf, isSyncMessage, merkleRoot, type SyncMessage } from "@/lib/chat/merkle";
import { getBrowserNodeId } from "@/lib/browser-node";

export type ChatState = {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  /** Eş kimliği → takma ad. */
  aliases: Record<string, string>;
  /** Devam eden medya aktarımı: mesaj kimliği → yüzde. */
  transfers: Record<string, number>;
};

let state: ChatState = { conversations: [], messages: {}, aliases: {}, transfers: {} };
const listeners = new Set<() => void>();
let booted = false;

function publish(patch: Partial<ChatState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function newId(prefix: string) {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return `${prefix}_${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function loadAliases(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem("tedbirge.chat.aliases") ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveAliases(map: Record<string, string>) {
  try {
    window.localStorage.setItem("tedbirge.chat.aliases", JSON.stringify(map));
  } catch {
    /* gizli mod */
  }
}

async function refreshConversations() {
  publish({ conversations: await listConversations() });
}

async function refreshMessages(convId: string) {
  const rows = await listMessages(convId);
  publish({ messages: { ...state.messages, [convId]: rows } });
}

/* --------------------------- konuşma yönetimi --------------------------- */

export function directConvId(a: string, b: string) {
  return `dm_${[a, b].sort().join("_")}`;
}

export async function ensureDirectConversation(peerId: string, title?: string): Promise<Conversation> {
  const me = getBrowserNodeId();
  const id = directConvId(me, peerId);
  const existing = await getConversation(id);
  if (existing) {
    if (title && existing.title !== title) {
      const updated = { ...existing, title };
      await putConversation(updated);
      await refreshConversations();
      return updated;
    }
    return existing;
  }
  const conv: Conversation = {
    id,
    title: title ?? state.aliases[peerId] ?? peerId,
    members: [peerId],
    group: false,
    lastTs: Date.now(),
    lastText: "",
    unread: 0,
    pinned: false,
  };
  await putConversation(conv);
  await refreshConversations();
  return conv;
}

export async function createGroup(title: string, members: string[]): Promise<Conversation> {
  const conv: Conversation = {
    id: newId("grp"),
    title: title.trim() || "Yeni grup",
    members: Array.from(new Set(members)),
    group: true,
    lastTs: Date.now(),
    lastText: "",
    unread: 0,
    pinned: false,
  };
  await putConversation(conv);
  await refreshConversations();
  // Üyeler grubu davetle öğrenir (grup meta verisi de uçtan uca şifreli gider).
  for (const m of conv.members) {
    void sendMesh("chat", m, {
      t: "group-invite",
      convId: conv.id,
      title: conv.title,
      members: conv.members,
      alias: getAlias(),
    });
  }
  return conv;
}

export async function togglePin(convId: string) {
  const conv = await getConversation(convId);
  if (!conv) return;
  await putConversation({ ...conv, pinned: !conv.pinned });
  await refreshConversations();
}

export async function removeConversation(convId: string) {
  await idbDeleteConversation(convId);
  await refreshConversations();
}

export async function markRead(convId: string) {
  const conv = await getConversation(convId);
  if (!conv) return;
  if (conv.unread) await putConversation({ ...conv, unread: 0 });
  const rows = await listMessages(convId);
  const targets = rows.filter((m) => !m.outgoing && m.status !== "read");
  for (const m of targets) {
    await putMessage({ ...m, status: "read" });
    void sendMesh("receipt", m.from, { t: "receipt", id: m.id, status: "read", convId });
  }
  await refreshConversations();
  await refreshMessages(convId);
}

/* ------------------------------ gönderim ------------------------------ */

async function targetsOf(conv: Conversation) {
  return conv.group ? conv.members : conv.members.slice(0, 1);
}

async function appendLocal(conv: Conversation, msg: ChatMessage) {
  await putMessage(msg);
  await putConversation({
    ...conv,
    lastTs: msg.ts,
    lastText: msg.kind === "media" ? `📎 ${msg.media?.name ?? "Dosya"}` : msg.text,
    unread: msg.outgoing ? conv.unread : conv.unread + 1,
  });
  await refreshConversations();
  await refreshMessages(conv.id);
}

export async function sendText(convId: string, text: string): Promise<void> {
  const conv = await getConversation(convId);
  if (!conv || !text.trim()) return;
  const me = getBrowserNodeId();
  const msg: ChatMessage = {
    id: newId("msg"),
    convId,
    from: me,
    to: conv.group ? conv.id : conv.members[0]!,
    kind: "text",
    text: text.trim(),
    ts: Date.now(),
    outgoing: true,
    status: "pending",
    };
  await appendLocal(conv, msg);

  let delivered = false;
  for (const peer of await targetsOf(conv)) {
    const ok = await sendMesh("chat", peer, {
      t: "text",
      id: msg.id,
      convId,
      group: conv.group,
      groupTitle: conv.group ? conv.title : undefined,
      members: conv.group ? conv.members : undefined,
      text: msg.text,
      ts: msg.ts,
      alias: getAlias(),
    });
    delivered = delivered || ok;
  }
  await setStatus(msg.id, delivered ? "sent" : "pending");
}

export async function sendMedia(convId: string, file: File): Promise<void> {
  const conv = await getConversation(convId);
  if (!conv) return;
  if (file.size > MAX_MEDIA_BYTES) throw new Error("Dosya 8 MB sınırını aşıyor.");
  const dataUrl = await fileToDataUrl(file);
  const me = getBrowserNodeId();
  const mid = newId("med");
  const msg: ChatMessage = {
    id: mid,
    convId,
    from: me,
    to: conv.group ? conv.id : conv.members[0]!,
    kind: "media",
    text: "",
    ts: Date.now(),
    outgoing: true,
    status: "pending",
    media: { name: file.name, mime: file.type || "application/octet-stream", size: file.size, dataUrl },
  };
  await appendLocal(conv, msg);

  const chunks = splitMedia({
    mid,
    convId,
    name: file.name,
    mime: msg.media!.mime,
    size: file.size,
    dataUrl,
  });
  let ok = false;
  for (const peer of await targetsOf(conv)) {
    for (let i = 0; i < chunks.length; i += 1) {
      const sent = await sendMesh("media", peer, { ...chunks[i]!, alias: getAlias(), group: conv.group });
      ok = ok || sent;
      publish({ transfers: { ...state.transfers, [mid]: Math.round(((i + 1) / chunks.length) * 100) } });
    }
  }
  const { [mid]: _done, ...rest } = state.transfers;
  publish({ transfers: rest });
  await setStatus(mid, ok ? "sent" : "pending");
}

async function setStatus(id: string, status: MessageStatus) {
  const msg = await getMessage(id);
  if (!msg) return;
  const rank: Record<MessageStatus, number> = { pending: 0, sent: 1, delivered: 2, read: 3 };
  if (rank[status] <= rank[msg.status]) return;
  await putMessage({ ...msg, status });
  await refreshMessages(msg.convId);
}

/* ------------------------------ alım ------------------------------ */

function rememberAlias(peerId: string, alias?: string) {
  if (!alias || state.aliases[peerId] === alias) return;
  const next = { ...state.aliases, [peerId]: alias };
  saveAliases(next);
  publish({ aliases: next });
}

function notify(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible") return;
  try {
    new Notification(title, { body, icon: "/icon-192.png", tag: "tedbirge-chat" });
  } catch {
    /* bazı tarayıcılar yalnızca servis çalışanından izin verir */
  }
}

type ChatPayload = {
  t?: string;
  id?: string;
  convId?: string;
  group?: boolean;
  groupTitle?: string;
  members?: string[];
  text?: string;
  ts?: number;
  alias?: string;
  title?: string;
};

async function onChat(from: string, raw: unknown) {
  const p = raw as ChatPayload;
  if (!p || typeof p !== "object") return;
  rememberAlias(from, p.alias);

  if (p.t === "group-invite" && p.convId) {
    const exists = await getConversation(p.convId);
    if (!exists) {
      await putConversation({
        id: p.convId,
        title: p.title ?? "Grup",
        members: Array.from(new Set([...(p.members ?? []), from])).filter((m) => m !== getBrowserNodeId()),
        group: true,
        lastTs: Date.now(),
        lastText: "Gruba eklendiniz",
        unread: 1,
        pinned: false,
      });
      await refreshConversations();
    }
    return;
  }

  if (p.t !== "text" || !p.id || !p.text) return;
  const convId = p.group && p.convId ? p.convId : directConvId(getBrowserNodeId(), from);
  let conv = await getConversation(convId);
  if (!conv) {
    conv = {
      id: convId,
      title: p.group ? (p.groupTitle ?? "Grup") : (p.alias ?? from),
      members: p.group ? (p.members ?? [from]).filter((m) => m !== getBrowserNodeId()) : [from],
      group: Boolean(p.group),
      lastTs: p.ts ?? Date.now(),
      lastText: "",
      unread: 0,
      pinned: false,
    };
    await putConversation(conv);
  }
  if (await getMessage(p.id)) return;

  const msg: ChatMessage = {
    id: p.id,
    convId,
    from,
    to: getBrowserNodeId(),
    kind: "text",
    text: p.text,
    ts: p.ts ?? Date.now(),
    outgoing: false,
    status: "delivered",
  };
  await appendLocal(conv, msg);
  void sendMesh("receipt", from, { t: "receipt", id: msg.id, status: "delivered", convId });
  notify(conv.title, p.text);
}

async function onReceipt(_from: string, raw: unknown) {
  const p = raw as { t?: string; id?: string; status?: MessageStatus };
  if (p?.t !== "receipt" || !p.id || !p.status) return;
  await setStatus(p.id, p.status);
}

async function onMedia(from: string, raw: unknown) {
  const p = raw as Record<string, unknown>;
  rememberAlias(from, typeof p.alias === "string" ? p.alias : undefined);
  if (!isMediaChunk(p)) return;
  const result = collectChunk(p);
  if (!result.done) {
    publish({
      transfers: { ...state.transfers, [p.mid]: Math.round((result.received / result.total) * 100) },
    });
    return;
  }
  const { [p.mid]: _x, ...rest } = state.transfers;
  publish({ transfers: rest });

  const group = Boolean((raw as { group?: boolean }).group);
  const convId = group ? result.convId : directConvId(getBrowserNodeId(), from);
  let conv = await getConversation(convId);
  if (!conv) {
    conv = {
      id: convId,
      title: state.aliases[from] ?? from,
      members: [from],
      group,
      lastTs: Date.now(),
      lastText: "",
      unread: 0,
      pinned: false,
    };
    await putConversation(conv);
  }
  if (await getMessage(result.mid)) return;
  await appendLocal(conv, {
    id: result.mid,
    convId,
    from,
    to: getBrowserNodeId(),
    kind: "media",
    text: "",
    ts: Date.now(),
    outgoing: false,
    status: "delivered",
    media: { name: result.name, mime: result.mime, size: result.size, dataUrl: result.dataUrl },
  });
  void sendMesh("receipt", from, { t: "receipt", id: result.mid, status: "delivered", convId });
  notify(conv.title, `📎 ${result.name}`);
}

/* --------------------- Merkle çevrimdışı eşitleme --------------------- */

async function onSync(from: string, raw: unknown) {
  if (!isSyncMessage(raw)) return;
  const msg = raw as SyncMessage;
  const all = await listAllMessages();

  if (msg.t === "digest") {
    const mine = digestsOf(all);
    for (const remote of msg.digests) {
      const local = mine.find((d) => d.convId === remote.convId);
      if (!local || local.root !== remote.root) {
        void sendMesh("sync", from, {
          t: "ids",
          convId: remote.convId,
          ids: all.filter((m) => m.convId === remote.convId).map((m) => m.id),
        } satisfies SyncMessage);
      }
    }
    return;
  }

  if (msg.t === "ids") {
    const localIds = new Set(all.filter((m) => m.convId === msg.convId).map((m) => m.id));
    const missing = msg.ids.filter((id) => !localIds.has(id));
    const theyMiss = all
      .filter((m) => m.convId === msg.convId && !msg.ids.includes(m.id))
      .map((m) => m.id);
    if (missing.length) {
      void sendMesh("sync", from, { t: "want", convId: msg.convId, ids: missing } satisfies SyncMessage);
    }
    if (theyMiss.length) {
      void sendMesh("sync", from, {
        t: "give",
        messages: all.filter((m) => theyMiss.includes(m.id)),
      } satisfies SyncMessage);
    }
    return;
  }

  if (msg.t === "want") {
    const give = all.filter((m) => msg.ids.includes(m.id));
    if (give.length) void sendMesh("sync", from, { t: "give", messages: give } satisfies SyncMessage);
    return;
  }

  if (msg.t === "give") {
    for (const m of msg.messages) {
      if (await getMessage(m.id)) continue;
      const conv =
        (await getConversation(m.convId)) ??
        ({
          id: m.convId,
          title: state.aliases[m.from] ?? m.from,
          members: [m.from],
          group: m.convId.startsWith("grp"),
          lastTs: m.ts,
          lastText: "",
          unread: 0,
          pinned: false,
        } satisfies Conversation);
      await putConversation(conv);
      await putMessage({ ...m, outgoing: m.from === getBrowserNodeId() });
    }
    await refreshConversations();
    const convIds = new Set(msg.messages.map((m) => m.convId));
    for (const id of convIds) await refreshMessages(id);
  }
}

/** Yeni eş göründüğünde Merkle kök özetlerini yollar (arka planda). */
export async function announceDigests(peerId?: string) {
  const all = await listAllMessages();
  const digests = digestsOf(all);
  if (!digests.length) return;
  await sendMesh("sync", peerId ?? "*", { t: "digest", digests } satisfies SyncMessage);
}

/** Bir konuşmanın anlık Merkle kökü (ayarlar ekranında gösterilir). */
export function conversationRoot(convId: string): string {
  return merkleRoot((state.messages[convId] ?? []).map((m) => m.id));
}

/* ------------------------------ önyükleme ------------------------------ */

export async function bootChat() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  bootMeshBus();
  publish({ aliases: loadAliases() });
  onMesh("chat", (from, body) => void onChat(from, body));
  onMesh("text", (from, body) => void onChat(from, body));
  onMesh("receipt", (from, body) => void onReceipt(from, body));
  onMesh("media", (from, body) => void onMedia(from, body));
  onMesh("sync", (from, body) => void onSync(from, body));
  await refreshConversations();
  await startNode();
  // Eşler tanışınca eksik mesajlar arka planda eşitlenir.
  setInterval(() => {
    if (knownPeerIds().length) void announceDigests();
  }, 30_000);
  setTimeout(() => void announceDigests(), 4_000);
}

export function useChat(): ChatState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function useConversationMessages(convId: string | null): ChatMessage[] {
  const s = useChat();
  if (!convId) return [];
  if (!s.messages[convId]) void refreshMessages(convId);
  return s.messages[convId] ?? [];
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  const res = await Notification.requestPermission();
  return res === "granted";
}
