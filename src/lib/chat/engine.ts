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
  type MessageGeo,
} from "@/lib/store/idb";
import { knownPeerIds, sendMesh, startNode } from "@/lib/node-runtime";
import { bootMeshBus, onMesh } from "@/lib/mesh-bus";
import { getAlias } from "@/lib/chat/profile";
import { getStoredPersonId } from "@/lib/chat/anchor";
import {
  collectChunk,
  fileToDataUrl,
  isMediaChunk,
  splitMedia,
  MAX_MEDIA_BYTES,
} from "@/lib/chat/media";
import { digestsOf, isSyncMessage, merkleRoot, type SyncMessage } from "@/lib/chat/merkle";
import { getBrowserNodeId } from "@/lib/browser-node";
import { bootPairing, isTrusted } from "@/lib/chat/pairing";
import { receivedSound, sentSound, vibrate } from "@/lib/chat/sounds";
import { showChatNotification, isWakePayload, type WakePayload } from "@/lib/chat/push";
import { isPttChunk, playPttChunk } from "@/lib/chat/ptt";
import { sweepExpired, ttlOf } from "@/lib/chat/ephemeral";
import { deleteMessageRecord } from "@/lib/store/idb";
import { getPrivacy } from "@/lib/chat/privacy";
import { collectEmergency, geoText, offlineMapFrame, type GeoPoint } from "@/lib/chat/location";
import { bootBackupTransfer } from "@/lib/chat/transfer";
import { isMuted } from "@/lib/chat/mute";
import { safeTitleOf } from "@/lib/chat/safe-title";
import { markSeen } from "@/lib/chat/last-seen";
import {
  announceName,
  answerNameTo,
  applyRemoteName,
  isNameExchange,
  requestNameFrom,
} from "@/lib/chat/name-exchange";
import { nameKeyOf, normalizedPersonName, resolveDisplayName } from "@/lib/chat/name-resolver";


export type ChatState = {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  /** Eş kimliği → takma ad. */
  aliases: Record<string, string>;
  /** Devam eden medya aktarımı: mesaj kimliği → yüzde. */
  transfers: Record<string, number>;
  /** Karşı taraf yazıyor: konuşma kimliği → son sinyal zamanı. */
  typing: Record<string, number>;
};

let state: ChatState = { conversations: [], messages: {}, aliases: {}, transfers: {}, typing: {} };
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
    return JSON.parse(window.localStorage.getItem("tedbirge.chat.aliases") ?? "{}") as Record<
      string,
      string
    >;
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

/**
 * Aynı kişinin (aynı takma ad / kimlik) farklı cihaz veya taşıyıcı üzerinden
 * gelen sinyalleri yüzünden listede birden çok kez görünmesini engeller.
 * Kopya konuşmaların mesajları hayatta kalan konuşmaya taşınır, kimlikleri
 * üye listesine eklenir; böylece hiçbir mesaj kaybolmaz.
 */
function identityKey(c: Conversation): string {
  const peer = c.members[0] ?? "";
  const name = normalizedPersonName(resolveDisplayName(peer) || state.aliases[peer] || c.title);
  return name ? `name:${name}` : `person:${nameKeyOf(peer) || peer}`;
}

/** İki konuşma aynı kişiye mi ait? (ortak cihaz kimliği ya da aynı ad) */
function sameIdentity(a: Conversation, b: Conversation): boolean {
  if (a.group || b.group) return false;
  if (a.members.some((m) => b.members.includes(m))) return true;
  return identityKey(a) === identityKey(b);
}

function fold(survivor: Conversation, drop: Conversation): Conversation {
  const newer = survivor.lastTs >= drop.lastTs ? survivor : drop;
  return {
    ...survivor,
    title: newer.title || survivor.title,
    members: Array.from(new Set([...survivor.members, ...drop.members])),
    unread: survivor.unread + drop.unread,
    lastTs: Math.max(survivor.lastTs, drop.lastTs),
    lastText: newer.lastText,
    pinned: survivor.pinned || drop.pinned,
  };
}

/**
 * Aynı kişinin (aynı kimlik / takma ad) farklı oturum ya da taşıyıcı üzerinden
 * gelen sinyalleri yüzünden listede birden çok kez görünmesini engeller.
 * Kopya konuşmaların mesajları hayatta kalan konuşmaya taşınır, cihaz kimlikleri
 * üye listesinde birleşir; böylece hiçbir mesaj kaybolmaz.
 */
async function mergeDuplicates(rows: Conversation[]): Promise<Conversation[]> {
  const survivors: Conversation[] = [];
  const dropped: Array<{ survivorIndex: number; drop: Conversation }> = [];
  for (const c of rows) {
    if (c.group) {
      survivors.push(c);
      continue;
    }
    const idx = survivors.findIndex((s) => !s.group && sameIdentity(s, c));
    if (idx < 0) {
      survivors.push(c);
      continue;
    }
    const survivor = survivors[idx];
    if (!survivor) {
      survivors.push(c);
      continue;
    }
    survivors[idx] = fold(survivor, c);
    dropped.push({ survivorIndex: idx, drop: c });
  }
  if (!dropped.length) return rows;
  for (const { survivorIndex, drop } of dropped) {
    const survivor = survivors[survivorIndex];
    if (!survivor) continue;
    for (const m of await listMessages(drop.id)) await putMessage({ ...m, convId: survivor.id });
    await idbDeleteConversation(drop.id);
  }
  for (const { survivorIndex } of dropped) {
    const survivor = survivors[survivorIndex];
    if (survivor) await putConversation(survivor);
  }
  return await listConversations();
}

/**
 * Tek seferlik temizlik: IndexedDB'de biriken mükerrer kişileri tek satıra indirir.
 * Yakınsayana kadar (en fazla 5 tur) yeniden çalışır.
 */
export async function cleanDuplicateConversations(): Promise<number> {
  let before = (await listConversations()).length;
  const initial = before;
  for (let i = 0; i < 5; i += 1) {
    const rows = await mergeDuplicates(await listConversations());
    if (rows.length === before) break;
    before = rows.length;
  }
  publish({ conversations: await listConversations() });
  return initial - before;
}

/** Sert temizlik sürüm anahtarı — artırılınca tüm cihazlarda bir kez daha koşar. */
const PURGE_KEY = "tedbirge.chat.purge.v1";

/**
 * Sert IndexedDB temizliği (tek seferlik migration).
 * Eski sürümlerden kalan; hiç mesajı olmayan, sabitlenmemiş ve hiçbir üyesi
 * eşleştirilmemiş "hayalet" konuşmaları siler. Geçerli, doğrulanmış ya da
 * içinde mesaj bulunan sohbetlere dokunulmaz.
 */
export async function purgeStaleConversations(force = false): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (!force && window.localStorage.getItem(PURGE_KEY)) return 0;
  let removed = 0;
  for (const c of await listConversations()) {
    if (c.pinned) continue;
    if (c.members.some((m) => isTrusted(m))) continue;

    const msgs = await listMessages(c.id);
    if (msgs.length > 0) continue;
    await idbDeleteConversation(c.id);
    removed += 1;
  }
  try {
    window.localStorage.setItem(PURGE_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
  if (removed) publish({ conversations: await listConversations() });
  return removed;
}

/** Veri değişti: cihazlar arası eşitleme kısa gecikmeyle tetiklenir. */
let syncEcho = 0;
function touchSync() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - syncEcho < 1_000) return;
  syncEcho = now;
  window.dispatchEvent(new CustomEvent("tedbirge:chat-changed"));
}

async function refreshConversations() {
  const rows = await mergeDuplicates(await listConversations());
  publish({ conversations: rows });
  touchSync();
}

/** Tüm listeleri ve açık sohbetleri yeniden yükler (eşitleme sonrası). */
export async function refreshAll(): Promise<void> {
  const rows = await mergeDuplicates(await listConversations());
  publish({ conversations: rows });
  for (const convId of Object.keys(state.messages)) {
    const msgs = await listMessages(convId);
    publish({ messages: { ...state.messages, [convId]: msgs } });
  }
}


/**
 * Gelen bir eş için doğru konuşmayı bulur: kimlik yeni olsa bile aynı takma
 * ada ya da ortak cihaz kimliğine sahip mevcut konuşma varsa ona bağlanır
 * (asla yeni bir liste elemanı oluşturulmaz).
 */
async function resolveDirectConversation(from: string, alias?: string): Promise<Conversation> {
  const id = directConvId(getBrowserNodeId(), from);
  const direct = await getConversation(id);
  if (direct) return direct;
  const rows = await listConversations();
  const byMember = rows.find((c) => !c.group && c.members.includes(from));
  if (byMember) return byMember;
  const name = normalizedPersonName(alias ?? resolveDisplayName(from) ?? state.aliases[from]);
  if (name) {
    const match = rows.find((c) => !c.group && identityKey(c) === `name:${name}`);
    if (match) {
      const merged = { ...match, members: Array.from(new Set([...match.members, from])) };
      await putConversation(merged);
      return merged;
    }
  }
  const conv: Conversation = {
    id,
    title: alias ?? state.aliases[from] ?? from,
    members: [from],
    group: false,
    lastTs: Date.now(),
    lastText: "",
    unread: 0,
    pinned: false,
  };
  await putConversation(conv);
  return conv;
}

async function refreshMessages(convId: string) {
  const rows = await listMessages(convId);
  publish({ messages: { ...state.messages, [convId]: rows } });
  touchSync();
}

/* --------------------------- konuşma yönetimi --------------------------- */

export function directConvId(a: string, b: string) {
  return `dm_${[a, b].sort().join("_")}`;
}

/** "Kendinize mesaj gönderin" — cihazda kalan kişisel not defteri. */
export const SELF_CONV_ID = "self_notes";

export function isSelfConversation(id: string) {
  return id === SELF_CONV_ID;
}

/** Not defterini oluşturur (varsa dokunmaz) ve listeye getirir. */
export async function ensureSelfConversation(title = "Kendinize not"): Promise<Conversation> {
  const existing = await getConversation(SELF_CONV_ID);
  if (existing) return existing;
  const conv: Conversation = {
    id: SELF_CONV_ID,
    title,
    members: [getBrowserNodeId()],
    group: false,
    lastTs: Date.now(),
    lastText: "",
    unread: 0,
    pinned: true,
  };
  await putConversation(conv);
  await refreshConversations();
  return conv;
}

export async function ensureDirectConversation(
  peerId: string,
  title?: string,
): Promise<Conversation> {
  // HAYALET KAYIT YASAĞI: adı çözülemeyen eş için kalıcı sohbet AÇILMAZ.
  // Var olan sohbet varsa döner; yoksa geçici (diske yazılmayan) kayıt
  // döner ve ad öğrenildiğinde gerçek adıyla kalıcı hale gelir.
  const { isTechnicalLabel } = await import("@/lib/chat/display-name");
  const known = (title ?? resolveDisplayName(peerId) ?? state.aliases[peerId] ?? "").trim();
  if (isTechnicalLabel(known)) {
    const existingId = directConvId(getBrowserNodeId(), peerId);
    const existing = await getConversation(existingId);
    if (existing) return existing;
    return {
      id: existingId,
      title: known || peerId,
      members: [peerId],
      group: false,
      lastTs: Date.now(),
      lastText: "",
      unread: 0,
      pinned: false,
    };
  }
  const conv = await resolveDirectConversation(peerId, title);
  if (title && conv.title !== title) {
    const updated = { ...conv, title };
    await putConversation(updated);
    await refreshConversations();
    return updated;
  }
  await refreshConversations();
  return conv;
}

export async function createGroup(title: string, members: string[]): Promise<Conversation> {
  const self = getBrowserNodeId();
  const conv: Conversation = {
    id: newId("grp"),
    title: title.trim() || "Yeni grup",
    members: Array.from(new Set(members)).filter((member) => member && member !== self),
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
      alias: getAlias(), personId: getStoredPersonId(),
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

/**
 * Sohbeti temizler: tüm mesajlar silinir, sohbet kaydı listede kalır.
 * Yalnızca bu cihazı etkiler; karşı tarafın kopyası dokunulmaz.
 */
export async function clearConversation(convId: string): Promise<number> {
  const rows = await listMessages(convId);
  for (const m of rows) await deleteMessageRecord(m.id);
  const conv = await getConversation(convId);
  if (conv) await putConversation({ ...conv, lastText: "", unread: 0 });
  await refreshMessages(convId);
  await refreshConversations();
  return rows.length;
}

/** Sohbeti okunmadı olarak işaretler (rozet görünür kalır). */
export async function markUnread(convId: string) {
  const conv = await getConversation(convId);
  if (!conv) return;
  if (!conv.unread) await putConversation({ ...conv, unread: 1 });
  await refreshConversations();
}

export async function markRead(convId: string) {
  const conv = await getConversation(convId);
  if (!conv) return;
  if (conv.unread) await putConversation({ ...conv, unread: 0 });
  const rows = await listMessages(convId);
  const targets = rows.filter((m) => !m.outgoing && m.status !== "read");
  // Okundu bilgisi gizliyse makbuz gönderilmez (karşılıklılık: kendi
  // gönderdiklerimizde de mavi tik gösterilmez).
  const silent = getPrivacy().hideReadReceipts;
  for (const m of targets) {
    await putMessage({ ...m, status: "read" });
    if (!silent) void sendMesh("receipt", m.from, { t: "receipt", id: m.id, status: "read", convId });
  }
  await refreshConversations();
  await refreshMessages(convId);
}

/* ------------------------------ gönderim ------------------------------ */

async function targetsOf(conv: Conversation) {
  // Not defteri ağa çıkmaz; mesaj yalnızca bu cihazda kalır.
  if (isSelfConversation(conv.id)) return [];
  // WhatsApp modeli: kanal açıktır, güvenlik arka planda (E2EE + TOFU).
  return Array.from(new Set(conv.members));
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

/**
 * Yerel sistem mesajı ekler (arama kaydı, bilgi satırı).
 * Ağa gönderilmez; yalnızca bu cihazın sohbet akışında görünür.
 */
export async function addSystemMessage(
  convId: string,
  text: string,
  kind: "system" | "call" = "call",
): Promise<void> {
  const conv = await getConversation(convId);
  if (!conv) return;
  const msg: ChatMessage = {
    id: newId("sys"),
    convId,
    from: getBrowserNodeId(),
    to: convId,
    kind,
    text,
    ts: Date.now(),
    outgoing: true,
    status: "read",
  };
  await putMessage(msg);
  await putConversation({ ...conv, lastTs: msg.ts, lastText: text });
  await refreshConversations();
  await refreshMessages(convId);
}

export async function sendText(

  convId: string,
  text: string,
  replyTo?: { id: string; text: string; author: string },
): Promise<void> {
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
    ...(replyTo ? { replyTo } : {}),
    ...(ttlOf(convId) ? { expiresAt: Date.now() + ttlOf(convId) } : {}),
  };
  await appendLocal(conv, msg);
  sentSound();

  let delivered = isSelfConversation(convId);
  for (const peer of await targetsOf(conv)) {
    let ok = false;
    try {
      ok = await sendMesh("chat", peer, {
        t: "text",
        id: msg.id,
        convId,
        group: conv.group,
        groupTitle: conv.group ? conv.title : undefined,
        members: conv.group ? conv.members : undefined,
        text: msg.text,
        ts: msg.ts,
        alias: getAlias(), personId: getStoredPersonId(),
        replyTo,
        ttlMs: ttlOf(convId) || undefined,
      });
    } catch {
      ok = false;
    }
    // Uyandırma paketi: karşı cihaz arka plandayken de bildirim üretilir.
    void sendMesh("presence", peer, {
      t: "wake",
      kind: "message",
      title: getAlias() || "Yeni mesaj",
      preview: msg.text.slice(0, 80),
    } satisfies WakePayload);
    delivered = delivered || ok;
  }
  await setStatus(msg.id, delivered ? "sent" : "pending");
  if (!delivered && !isSelfConversation(convId)) {
    throw new Error("Mesaj sıraya alındı; alıcının bağlantısı kurulunca otomatik gönderilecek.");
  }
}

/** Bir sohbetin hedef düğümleri (bas-konuş ve konferans için). */
export async function conversationTargets(convId: string): Promise<string[]> {
  const conv = await getConversation(convId);
  return conv ? await targetsOf(conv) : [];
}

/** Kaydedilmiş sesli not / telsiz kaydını sohbete ekler. */
export async function sendVoiceFile(
  convId: string,
  file: File,
  transcript?: string,
): Promise<void> {
  await sendMedia(convId, file, transcript);
}

export async function sendMedia(
  convId: string,
  file: File,
  transcript?: string,
): Promise<void> {
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
    media: {
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      dataUrl,
    },
    ...(transcript ? { transcript } : {}),
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
  try {
    const peers = await targetsOf(conv);
    for (const peer of peers) {
      for (let i = 0; i < chunks.length; i += 1) {
        const sent = await sendMesh("media", peer, {
          ...chunks[i]!,
          alias: getAlias(), personId: getStoredPersonId(),
          group: conv.group,
          transcript,
        });
        ok = ok || sent;
        publish({
          transfers: { ...state.transfers, [mid]: Math.round(((i + 1) / chunks.length) * 100) },
        });
        // İlk parça bile gitmiyorsa bu eş için ısrar etme; kuyruk devralır.
        if (!sent && i === 0) break;
      }
    }
  } finally {
    // Ne olursa olsun ilerleme çubuğu kapanır; "aktarılıyor" asla takılı kalmaz.
    const { [mid]: _done, ...rest } = state.transfers;
    publish({ transfers: rest });
  }
  await setStatus(mid, ok ? "sent" : "pending");
}


/* -------------------- konum ve acil durum yayını -------------------- */

/** Konumu çevrimdışı harita karesiyle birlikte sohbete gönderir. */
export async function sendLocation(convId: string, point: GeoPoint, note?: string): Promise<void> {
  const conv = await getConversation(convId);
  if (!conv) return;
  const me = getBrowserNodeId();
  const geo: MessageGeo = {
    lat: point.lat,
    lon: point.lon,
    acc: point.acc,
    alt: point.alt,
    frame: offlineMapFrame(point, note?.trim() || "Konumum"),
    note: note?.trim() || undefined,
  };
  const msg: ChatMessage = {
    id: newId("loc"),
    convId,
    from: me,
    to: conv.group ? conv.id : conv.members[0]!,
    kind: "location",
    text: `📍 ${geoText(point)}`,
    ts: Date.now(),
    outgoing: true,
    status: "pending",
    geo,
    ...(ttlOf(convId) ? { expiresAt: Date.now() + ttlOf(convId) } : {}),
  };
  await appendLocal(conv, msg);
  sentSound();

  let delivered = isSelfConversation(convId);
  for (const peer of await targetsOf(conv)) {
    // Harita karesi alıcı cihazda yeniden çizilir — paket küçük kalır.
    const ok = await sendMesh(
      "chat",
      peer,
      {
        t: "geo",
        id: msg.id,
        convId,
        group: conv.group,
        text: msg.text,
        ts: msg.ts,
        alias: getAlias(), personId: getStoredPersonId(),
        geo: { ...geo, frame: undefined },
        ttlMs: ttlOf(convId) || undefined,
      },
      1,
    );
    delivered = delivered || ok;
  }
  await setStatus(msg.id, delivered ? "sent" : "pending");
}

export type SosResult = { conversations: number; peers: number; hasLocation: boolean };

/**
 * Acil durum yayını: tek dokunuşla tüm sohbetlere ve menzildeki tüm
 * düğümlere konum + pil + not gönderilir. Öncelik 0 — kuyrukta asla
 * budanmaz, çevrimdışıysa bağlantı gelir gelmez ilk o iletilir.
 */
export async function broadcastSos(note?: string): Promise<SosResult> {
  const info = await collectEmergency(note);
  const me = getBrowserNodeId();
  const alias = getAlias() || me;
  const geo: MessageGeo | undefined = info.point
    ? {
        lat: info.point.lat,
        lon: info.point.lon,
        acc: info.point.acc,
        alt: info.point.alt,
        frame: offlineMapFrame(info.point, `ACİL — ${alias}`),
        battery: info.battery,
        charging: info.charging,
        note: note?.trim() || undefined,
      }
    : undefined;

  const parts = [
    "🆘 ACİL DURUM",
    info.point ? `Konum: ${geoText(info.point)}` : "Konum alınamadı",
    info.battery != null ? `Pil: %${info.battery}${info.charging ? " (şarjda)" : ""}` : "",
    note?.trim() ? `Not: ${note.trim()}` : "",
  ].filter(Boolean);
  const text = parts.join(" · ");

  const convs = await listConversations();
  for (const conv of convs) {
    const msg: ChatMessage = {
      id: newId("sos"),
      convId: conv.id,
      from: me,
      to: conv.group ? conv.id : (conv.members[0] ?? "*"),
      kind: "sos",
      text,
      ts: Date.now(),
      outgoing: true,
      status: "pending",
      geo,
    };
    await appendLocal(conv, msg);
    for (const peer of await targetsOf(conv)) {
      void sendMesh(
        "chat",
        peer,
        {
          t: "sos",
          id: msg.id,
          convId: conv.id,
          group: conv.group,
          text,
          ts: msg.ts,
          alias,
          geo: geo ? { ...geo, frame: undefined } : undefined,
        },
        0,
      );
      void sendMesh("presence", peer, {
        t: "wake",
        kind: "call",
        title: `🆘 ${alias} acil yardım istiyor`,
        preview: text.slice(0, 120),
      } satisfies WakePayload);
    }
  }

  // Sohbeti olmayan menzildeki düğümlere de yayın (herkese açık uyarı).
  const peers = knownPeerIds();
  void sendMesh("alert", "*", { t: "sos", text, alias, geo: geo ? { ...geo, frame: undefined } : undefined }, 0);

  return { conversations: convs.length, peers: peers.length, hasLocation: Boolean(info.point) };
}

/* ------------------- düzenleme, sabitleme, iletme ------------------- */

/** Mesaj düzenleme penceresi (WhatsApp ile aynı: 15 dakika). */
export const EDIT_WINDOW_MS = 15 * 60_000;
/** Herkesten silme penceresi (WhatsApp: yaklaşık 2 gün). */
export const DELETE_WINDOW_MS = 2 * 24 * 60 * 60_000;

export function canEdit(msg: ChatMessage): boolean {
  return (
    msg.outgoing && msg.kind === "text" && !msg.deleted && Date.now() - msg.ts < EDIT_WINDOW_MS
  );
}

export function canDeleteForEveryone(msg: ChatMessage): boolean {
  return msg.outgoing && !msg.deleted && Date.now() - msg.ts < DELETE_WINDOW_MS;
}

export function remainingWindow(msg: ChatMessage, windowMs: number): string {
  const left = windowMs - (Date.now() - msg.ts);
  if (left <= 0) return "süre doldu";
  const min = Math.ceil(left / 60_000);
  if (min < 60) return `${min} dk`;
  const h = Math.ceil(min / 60);
  return h < 48 ? `${h} sa` : `${Math.ceil(h / 24)} gün`;
}

/** Gönderilmiş metin mesajını düzenler ve karşı tarafta günceller. */
export async function editMessage(messageId: string, text: string): Promise<void> {
  const msg = await getMessage(messageId);
  if (!msg) return;
  const clean = text.trim();
  if (!clean || clean === msg.text) return;
  if (!canEdit(msg)) throw new Error("Düzenleme süresi doldu (15 dakika).");
  await putMessage({ ...msg, text: clean, editedAt: Date.now() });
  await refreshMessages(msg.convId);
  await refreshConversations();
  const conv = await getConversation(msg.convId);
  if (!conv) return;
  for (const peer of await targetsOf(conv)) {
    void sendMesh("chat", peer, {
      t: "edit",
      id: messageId,
      convId: msg.convId,
      text: clean,
      alias: getAlias(), personId: getStoredPersonId(),
    });
  }
}

/** Sohbetin üstünde bir mesajı sabitler / sabitlemeyi kaldırır. */
export async function pinMessage(convId: string, messageId: string | null): Promise<void> {
  const conv = await getConversation(convId);
  if (!conv) return;
  const next = conv.pinnedMessageId === messageId ? undefined : (messageId ?? undefined);
  await putConversation({ ...conv, pinnedMessageId: next });
  await refreshConversations();
  for (const peer of await targetsOf(conv)) {
    void sendMesh("chat", peer, {
      t: "pin",
      id: next ?? "",
      convId,
      alias: getAlias(), personId: getStoredPersonId(),
    });
  }
}

/** Mesajı başka sohbetlere iletir; alıntılı iletmede kaynak korunur. */
export async function forwardMessage(
  messageId: string,
  targetConvIds: string[],
  options?: { quote?: boolean; authorName?: string },
): Promise<number> {
  const msg = await getMessage(messageId);
  if (!msg || msg.deleted) return 0;
  const author = options?.authorName ?? (msg.outgoing ? getAlias() || "Ben" : msg.from);
  let sent = 0;
  for (const convId of targetConvIds) {
    const conv = await getConversation(convId);
    if (!conv) continue;
    if (msg.kind === "media" && msg.media) {
      const res = await fetch(msg.media.dataUrl);
      const blob = await res.blob();
      await sendMedia(convId, new File([blob], msg.media.name, { type: msg.media.mime }));
      sent += 1;
      continue;
    }
    const body = msg.text || "";
    const text = options?.quote ? `“${body}” — ${author}` : body;
    if (!text.trim()) continue;
    await sendForwardedText(conv, text, author);
    sent += 1;
  }
  return sent;
}

async function sendForwardedText(conv: Conversation, text: string, author: string) {
  const me = getBrowserNodeId();
  const msg: ChatMessage = {
    id: newId("msg"),
    convId: conv.id,
    from: me,
    to: conv.group ? conv.id : conv.members[0]!,
    kind: "text",
    text,
    ts: Date.now(),
    outgoing: true,
    status: "pending",
    forwarded: true,
    forwardedFrom: author,
    ...(ttlOf(conv.id) ? { expiresAt: Date.now() + ttlOf(conv.id) } : {}),
  };
  await appendLocal(conv, msg);
  let delivered = isSelfConversation(conv.id);
  for (const peer of await targetsOf(conv)) {
    const ok = await sendMesh("chat", peer, {
      t: "text",
      id: msg.id,
      convId: conv.id,
      group: conv.group,
      groupTitle: conv.group ? conv.title : undefined,
      members: conv.group ? conv.members : undefined,
      text,
      ts: msg.ts,
      alias: getAlias(), personId: getStoredPersonId(),
      forwarded: true,
      forwardedFrom: author,
      ttlMs: ttlOf(conv.id) || undefined,
    });
    delivered = delivered || ok;
  }
  await setStatus(msg.id, delivered ? "sent" : "pending");
}

async function setStatus(id: string, status: MessageStatus) {
  const msg = await getMessage(id);
  if (!msg) return;
  const rank: Record<MessageStatus, number> = {
    pending: 0,
    failed: 0,
    sent: 1,
    delivered: 2,
    read: 3,
  };
  // "İletilemedi" yalnızca hâlâ bekleyen bir mesaja yazılabilir; teslim
  // edilmiş bir mesaj hatalıya düşmez.
  if (status === "failed") {
    if (msg.status !== "pending") return;
  } else if (rank[status] <= rank[msg.status] && msg.status !== "failed") return;
  await putMessage({ ...msg, status });
  await refreshMessages(msg.convId);
}

/**
 * Sakla-ilet kuyruğu penceresi. Bu süre boyunca teslim edilemeyen mesaj
 * sessizce düşürülmez; kullanıcıya "iletilemedi · yeniden dene" olarak
 * gösterilir ve tek dokunuşla yeniden gönderilebilir.
 */
export const PENDING_TTL_MS = 30 * 60_000;

/** Süresi dolan bekleyen mesajları "iletilemedi" olarak işaretler. */
export async function sweepStalePending(): Promise<number> {
  const now = Date.now();
  const rows = await listAllMessages();
  let n = 0;
  for (const m of rows) {
    if (!m.outgoing || m.status !== "pending") continue;
    if (now - m.ts < PENDING_TTL_MS) continue;
    await putMessage({ ...m, status: "failed" });
    n += 1;
  }
  if (n) {
    await refreshConversations();
    for (const convId of Object.keys(state.messages)) await refreshMessages(convId);
  }
  return n;
}

/** Aynı mesaj için ikinci bir yeniden gönderim başlamasın. */
const retryInFlight = new Set<string>();

/** Tek dokunuşla yeniden gönderme — iletilemeyen mesajı tekrar dener. */
export async function retryMessage(messageId: string): Promise<boolean> {
  if (retryInFlight.has(messageId)) return false;
  const msg = await getMessage(messageId);
  if (!msg || !msg.outgoing) return false;
  const conv = await getConversation(msg.convId);
  if (!conv) return false;

  retryInFlight.add(messageId);
  try {
    await putMessage({ ...msg, status: "pending", ts: msg.ts });
    await refreshMessages(msg.convId);

    let delivered = isSelfConversation(conv.id);
    const peers = await targetsOf(conv);

    if (msg.kind === "media" && msg.media?.dataUrl) {
      // Medya mesajı boş metin olarak değil, kendi parçalarıyla gönderilir.
      const chunks = splitMedia({
        mid: msg.id,
        convId: conv.id,
        name: msg.media.name,
        mime: msg.media.mime,
        size: msg.media.size,
        dataUrl: msg.media.dataUrl,
      });
      for (const peer of peers) {
        for (let i = 0; i < chunks.length; i += 1) {
          const sent = await sendMesh("media", peer, {
            ...chunks[i]!,
            alias: getAlias(), personId: getStoredPersonId(),
            group: conv.group,
          }).catch(() => false);
          delivered = delivered || sent;
          if (!sent && i === 0) break;
        }
      }
    } else if (msg.kind === "location" && msg.geo) {
      for (const peer of peers) {
        const ok = await sendMesh(
          "chat",
          peer,
          {
            t: "geo",
            id: msg.id,
            convId: conv.id,
            group: conv.group,
            text: msg.text,
            ts: msg.ts,
            alias: getAlias(), personId: getStoredPersonId(),
            geo: { ...msg.geo, frame: undefined },
          },
          1,
        ).catch(() => false);
        delivered = delivered || ok;
      }
    } else {
      for (const peer of peers) {
        const ok = await sendMesh("chat", peer, {
          t: "text",
          id: msg.id,
          convId: conv.id,
          group: conv.group,
          groupTitle: conv.group ? conv.title : undefined,
          members: conv.group ? conv.members : undefined,
          text: msg.text ?? "",
          ts: msg.ts,
          alias: getAlias(), personId: getStoredPersonId(),
        }).catch(() => false);
        delivered = delivered || ok;
      }
    }

    await putMessage({ ...msg, status: delivered ? "sent" : "pending" });
    await refreshMessages(msg.convId);
    return delivered;
  } finally {
    retryInFlight.delete(messageId);
  }
}


/* ------------------ üstel geri çekilmeli otomatik yeniden gönderim ------------------ */

/**
 * Bekleyen mesajlar sessizce beklemez: 5 sn, 10 sn, 20 sn… şeklinde
 * artan aralıklarla yeniden denenir. En fazla RETRY_MAX deneme yapılır;
 * ardından mesaj "iletilemedi" olarak işaretlenir ve kullanıcı tek
 * dokunuşla kendisi tekrar deneyebilir.
 */
const RETRY_BASE_MS = 5_000;
const RETRY_MAX = 6;
type RetryState = { attempts: number; nextAt: number };
const retryState = new Map<string, RetryState>();

function retryDelay(attempts: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** attempts, 5 * 60_000);
}

/** Ağ geri geldiğinde tarayıcının kuyruğu uyandırmasını ister. */
async function requestBackgroundSync(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    await reg.sync?.register("tedbirge-outbox");
  } catch {
    /* Background Sync desteklenmiyor (iOS Safari): kuyruk zamanlayıcı ile işlenir. */
  }
}

/** Kuyruktaki mesajları sırayla, geri çekilmeli olarak yeniden dener. */
export async function pumpRetryQueue(): Promise<number> {
  const now = Date.now();
  const rows = await listAllMessages();
  let tried = 0;
  for (const m of rows) {
    if (!m.outgoing || m.status !== "pending") continue;
    const st = retryState.get(m.id) ?? { attempts: 0, nextAt: m.ts + RETRY_BASE_MS };
    if (now < st.nextAt) {
      retryState.set(m.id, st);
      continue;
    }
    if (st.attempts >= RETRY_MAX) {
      retryState.delete(m.id);
      await putMessage({ ...m, status: "failed" });
      await refreshMessages(m.convId);
      continue;
    }
    tried += 1;
    const ok = await retryMessage(m.id).catch(() => false);
    if (ok) retryState.delete(m.id);
    else {
      retryState.set(m.id, {
        attempts: st.attempts + 1,
        nextAt: Date.now() + retryDelay(st.attempts + 1),
      });
      void requestBackgroundSync();
    }
  }
  return tried;
}



function clearTyping(convId: string) {
  if (state.typing[convId] === undefined) return;
  const { [convId]: _drop, ...rest } = state.typing;
  publish({ typing: rest });
}

/** Karşı tarafa "yazıyor…" sinyali gönderir (kısıtlı sıklıkta). */
let lastTypingSent = 0;
export async function sendTyping(convId: string, active = true) {
  if (getPrivacy().hideTyping) return;
  const now = Date.now();
  if (active && now - lastTypingSent < 2200) return;
  lastTypingSent = active ? now : 0;
  const conv = await getConversation(convId);
  if (!conv) return;
  for (const peer of await targetsOf(conv)) {
    void sendMesh("chat", peer, {
      t: active ? "typing" : "stop-typing",
      convId,
      group: conv.group,
      alias: getAlias(), personId: getStoredPersonId(),
    });
  }
}

/** Mesaja emoji tepkisi ekler/kaldırır. */
export async function reactToMessage(messageId: string, emoji: string) {
  const msg = await getMessage(messageId);
  if (!msg) return;
  const me = getBrowserNodeId();
  const reactions = { ...(msg.reactions ?? {}) };
  const next = reactions[me] === emoji ? "" : emoji;
  if (next) reactions[me] = next;
  else delete reactions[me];
  await putMessage({ ...msg, reactions });
  await refreshMessages(msg.convId);
  const conv = await getConversation(msg.convId);
  if (!conv) return;
  for (const peer of await targetsOf(conv)) {
    void sendMesh("chat", peer, {
      t: "react",
      id: messageId,
      emoji: next,
      convId: msg.convId,
      alias: getAlias(), personId: getStoredPersonId(),
    });
  }
}

/** Mesajı herkes için siler (WhatsApp "herkesten sil" davranışı). */
export async function deleteMessage(messageId: string, forEveryone = true) {
  const msg = await getMessage(messageId);
  if (!msg) return;
  // Herkesten silme yalnızca pencere içindeki KENDİ mesajlarımızda geçerlidir;
  // dışındaysa sessizce "bende sil"e düşer.
  const everyone = forEveryone && canDeleteForEveryone(msg);
  await putMessage({ ...msg, deleted: true, text: "", media: undefined, geo: undefined });
  await refreshMessages(msg.convId);
  await refreshConversations();
  if (!everyone) return;
  const conv = await getConversation(msg.convId);
  if (!conv) return;
  for (const peer of await targetsOf(conv)) {
    void sendMesh("chat", peer, {
      t: "delete",
      id: messageId,
      convId: msg.convId,
      alias: getAlias(), personId: getStoredPersonId(),
    });
  }
}

/** Mesajı yıldızlar (yalnızca bu cihazda saklanır). */
export async function toggleStar(messageId: string) {
  const msg = await getMessage(messageId);
  if (!msg) return;
  await putMessage({ ...msg, starred: !msg.starred });
  await refreshMessages(msg.convId);
}

/* ------------------------------ alım ------------------------------ */

function rememberAlias(peerId: string, alias?: string) {
  if (!alias || state.aliases[peerId] === alias) return;
  const next = { ...state.aliases, [peerId]: alias };
  saveAliases(next);
  publish({ aliases: next });
}

function notify(title: string, body: string, convId?: string) {
  // Sessize alınmış sohbette bildirim/ses üretilmez (rozet görünmeye devam eder).
  if (convId && isMuted(convId)) return;
  void showChatNotification({ title, body, kind: "message" });
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
  replyTo?: { id: string; text: string; author: string };
  emoji?: string;
  ttlMs?: number;
  geo?: MessageGeo;
  forwarded?: boolean;
  forwardedFrom?: string;
  /** Numara-çıpalı kişi kimliği — ad tek kanalda birleşsin diye taşınır. */
  personId?: string;
};

async function onChat(from: string, raw: unknown) {
  const p = raw as ChatPayload;
  if (!p || typeof p !== "object") return;
  rememberAlias(from, p.alias);

  // Ad talebi / ad beyanı: başlıklar her cihazda aynı görünsün.
  if (isNameExchange(p)) {
    const changed = applyRemoteName(from, p.alias, p.personId);
    if (p.t === "name-req") void answerNameTo(from);
    if (changed) {
      await refreshConversations();
      for (const convId of Object.keys(state.messages)) await refreshMessages(convId);
    }
    return;
  }
  // Her mesajla gelen kimlik bilgisi de tek ad kanalına işlenir.
  if (p.personId || p.alias) applyRemoteName(from, p.alias, p.personId);



  if (p.t === "typing" || p.t === "stop-typing") {
    const conv =
      p.group && p.convId
        ? await getConversation(p.convId)
        : await resolveDirectConversation(from, p.alias);
    if (!conv) return;
    if (p.t === "stop-typing") clearTyping(conv.id);
    else {
      publish({ typing: { ...state.typing, [conv.id]: Date.now() } });
      setTimeout(() => {
        if (Date.now() - (state.typing[conv.id] ?? 0) >= 4500) clearTyping(conv.id);
      }, 5000);
    }
    return;
  }

  if (p.t === "react" && p.id && p.emoji !== undefined) {
    const msg = await getMessage(p.id);
    if (!msg) return;
    const reactions = { ...(msg.reactions ?? {}) };
    if (p.emoji) reactions[from] = p.emoji;
    else delete reactions[from];
    await putMessage({ ...msg, reactions });
    await refreshMessages(msg.convId);
    return;
  }

  if (p.t === "delete" && p.id) {
    const msg = await getMessage(p.id);
    if (!msg) return;
    await putMessage({ ...msg, deleted: true, text: "", media: undefined, geo: undefined });
    await refreshMessages(msg.convId);
    await refreshConversations();
    return;
  }

  if (p.t === "edit" && p.id && typeof p.text === "string") {
    const msg = await getMessage(p.id);
    if (!msg || msg.deleted) return;
    await putMessage({ ...msg, text: p.text, editedAt: Date.now() });
    await refreshMessages(msg.convId);
    await refreshConversations();
    return;
  }

  if (p.t === "pin") {
    const conv =
      p.group && p.convId
        ? await getConversation(p.convId)
        : await resolveDirectConversation(from, p.alias);
    if (!conv) return;
    await putConversation({ ...conv, pinnedMessageId: p.id || undefined });
    await refreshConversations();
    return;
  }

  if ((p.t === "geo" || p.t === "sos") && p.id) {
    const conv =
      p.group && p.convId
        ? ((await getConversation(p.convId)) ?? (await resolveDirectConversation(from, p.alias)))
        : await resolveDirectConversation(from, p.alias);
    if (!conv || (await getMessage(p.id))) return;
    const geo = p.geo
      ? {
          ...p.geo,
          frame: offlineMapFrame(
            { lat: p.geo.lat, lon: p.geo.lon, acc: p.geo.acc, alt: p.geo.alt, ts: p.ts ?? Date.now() },
            p.t === "sos" ? `ACİL — ${p.alias ?? from}` : (p.alias ?? "Konum"),
          ),
        }
      : undefined;
    await appendLocal(conv, {
      id: p.id,
      convId: conv.id,
      from,
      to: getBrowserNodeId(),
      kind: p.t === "sos" ? "sos" : "location",
      text: p.text ?? "📍 Konum",
      ts: p.ts ?? Date.now(),
      outgoing: false,
      status: "delivered",
      geo,
      ...(p.ttlMs ? { expiresAt: Date.now() + p.ttlMs } : {}),
    });
    receivedSound();
    vibrate(p.t === "sos" ? 60 : 14);
    notify(
      p.t === "sos" ? `🆘 ${p.alias ?? conv.title}` : conv.title,
      p.text ?? "Konum paylaşıldı",
    );
    return;
  }



  if (p.t === "group-invite" && p.convId) {
    const exists = await getConversation(p.convId);
    if (!exists) {
      await putConversation({
        id: p.convId,
        title: p.title ?? "Grup",
        members: Array.from(new Set([...(p.members ?? []), from])).filter(
          (m) => m !== getBrowserNodeId(),
        ),
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
  let conv: Conversation;
  if (p.group && p.convId) {
    conv = (await getConversation(p.convId)) ?? {
      id: p.convId,
      title: p.groupTitle ?? "Grup",
      members: (p.members ?? [from]).filter((m) => m !== getBrowserNodeId()),
      group: true,
      lastTs: p.ts ?? Date.now(),
      lastText: "",
      unread: 0,
      pinned: false,
    };
    await putConversation(conv);
  } else {
    conv = await resolveDirectConversation(from, p.alias);
  }
  const convId = conv.id;
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
    ...(p.replyTo ? { replyTo: p.replyTo } : {}),
    ...(p.forwarded ? { forwarded: true, forwardedFrom: p.forwardedFrom } : {}),
    ...(p.ttlMs || ttlOf(convId) ? { expiresAt: Date.now() + (p.ttlMs || ttlOf(convId)) } : {}),
  };
  await appendLocal(conv, msg);
  clearTyping(convId);
  if (!isMuted(conv.id)) {
    receivedSound();
    vibrate(14);
  }
  markSeen(from);
  void sendMesh("receipt", from, { t: "receipt", id: msg.id, status: "delivered", convId });
  notify(safeTitleOf(conv), p.text, conv.id);
}

async function onReceipt(_from: string, raw: unknown) {
  const p = raw as { t?: string; id?: string; status?: MessageStatus };
  if (p?.t !== "receipt" || !p.id || !p.status) return;
  await setStatus(p.id, p.status);
}

async function onMedia(from: string, raw: unknown) {
  const p = raw as Record<string, unknown>;
  rememberAlias(from, typeof p.alias === "string" ? p.alias : undefined);
  if (isPttChunk(p)) {
    // Bas-konuş çerçevesi: anında çalınır, kayıt sesli not olarak da gelir.
    playPttChunk(p);
    return;
  }
  if (!isMediaChunk(p)) return;
  const result = collectChunk(p);
  if (!result.done) {
    publish({
      transfers: {
        ...state.transfers,
        [p.mid]: Math.round((result.received / result.total) * 100),
      },
    });
    return;
  }
  const { [p.mid]: _x, ...rest } = state.transfers;
  publish({ transfers: rest });

  const group = Boolean((raw as { group?: boolean }).group);
  let conv: Conversation;
  if (group) {
    conv = (await getConversation(result.convId)) ?? {
      id: result.convId,
      title: state.aliases[from] ?? "Grup",
      members: [from],
      group: true,
      lastTs: Date.now(),
      lastText: "",
      unread: 0,
      pinned: false,
    };
    await putConversation(conv);
  } else {
    conv = await resolveDirectConversation(from);
  }
  const convId = conv.id;
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
    ...(typeof (raw as { transcript?: unknown }).transcript === "string" &&
    (raw as { transcript: string }).transcript
      ? { transcript: (raw as { transcript: string }).transcript }
      : {}),
  });
  void sendMesh("receipt", from, { t: "receipt", id: result.mid, status: "delivered", convId });
  receivedSound();
  notify(safeTitleOf(conv), `📎 ${result.name}`, conv.id);
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
      void sendMesh("sync", from, {
        t: "want",
        convId: msg.convId,
        ids: missing,
      } satisfies SyncMessage);
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
    if (give.length)
      void sendMesh("sync", from, { t: "give", messages: give } satisfies SyncMessage);
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

/**
 * Adı çözülemeyen eşlere ad talebi gönderir. Yanıt gelince geçmiş
 * sohbet ve arama kayıtlarının başlıkları geriye dönük düzelir.
 */
export async function requestMissingNames(): Promise<number> {
  const peers = new Set<string>();
  for (const conv of state.conversations) {
    if (conv.group) continue;
    for (const member of conv.members) {
      if (!member || member === getBrowserNodeId()) continue;
      if (resolveDisplayName(member)) continue;
      peers.add(member);
    }
  }
  for (const peer of peers) await requestNameFrom(peer);
  return peers.size;
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
  await bootPairing();
  publish({ aliases: loadAliases() });
  // Web Push: izin verilmişse cihaz aboneliği tazelenir (uç adresi süresi dolabilir).
  void import("@/lib/chat/webpush")
    .then(async (m) => {
      const { getBrowserNodeId } = await import("@/lib/browser-node");
      await m.syncWebPush(getBrowserNodeId());
    })
    .catch(() => {});
  // Bildirim geldiğinde bekleyen şifreli zarflar hemen çekilsin.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const type = (event.data as { type?: string } | null)?.type;
      if (type === "tedbirge-push" || type === "tedbirge-push-open") {
        window.dispatchEvent(new CustomEvent("tedbirge:relay-poll-now"));
      }
      // Arka plan eşitleme: ağ geri geldi, bekleyen mesajları gönder.
      if (type === "tedbirge-sync") void pumpRetryQueue();
    });
  }

  onMesh("chat", (from, body) => void onChat(from, body));
  onMesh("text", (from, body) => void onChat(from, body));
  onMesh("receipt", (from, body) => void onReceipt(from, body));
  onMesh("media", (from, body) => void onMedia(from, body));
  onMesh("sync", (from, body) => void onSync(from, body));
  onMesh("presence", (_from, body) => {
    if (!isWakePayload(body)) return;
    void showChatNotification({ title: body.title, body: body.preview, kind: body.kind });
  });
  window.addEventListener("tedbirge:outbox-sent", (event) => {
    const messageId = (event as CustomEvent<{ messageId?: string }>).detail?.messageId;
    if (messageId) void setStatus(messageId, "sent");
  });
  // Sohbeti olmayan menzildeki düğümlerden gelen acil durum yayını.
  onMesh("alert", (_from, body) => {
    const p = body as { t?: string; text?: string; alias?: string } | null;
    if (!p || p.t !== "sos" || !p.text) return;
    receivedSound();
    vibrate(60);
    void showChatNotification({
      title: `🆘 ${p.alias ?? "Yakındaki bir cihaz"}`,
      body: p.text,
      kind: "call",
    });
  });
  bootBackupTransfer();
  // Cihazlar arası şifreli sohbet eşitlemesi (otomatik, kullanıcı müdahalesiz).
  void import("@/lib/chat/history-sync").then((m) => m.startHistorySync());
  // Kaybolan mesajlar: açılışta ve her dakika süresi dolanlar silinir.
  void sweepEphemeral();
  setInterval(() => void sweepEphemeral(), 60_000);
  // Kuyrukta çok bekleyen mesajlar sessizce düşmez; "iletilemedi" olur.
  void sweepStalePending();
  setInterval(() => void sweepStalePending(), 60_000);
  // Üstel geri çekilmeli otomatik yeniden gönderim (yalnızca lider sekmede).
  setInterval(() => {
    void import("@/lib/chat/leader")
      .then((m) => (m.isLeaderTab() ? pumpRetryQueue() : 0))
      .catch((error: unknown) => console.error("[chat] yeniden gönderim turu başarısız", error));
  }, 15_000);
  // Ağ geri geldiğinde ya da uygulamaya dönüldüğünde kuyruk hemen boşalır:
  // "çevrimdışı — n mesaj bekliyor" durumu sonsuza kadar takılı kalmaz.
  const flushNow = () => {
    void pumpRetryQueue().catch((error: unknown) =>
      console.error("[chat] kuyruk boşaltılamadı", error),
    );
    void requestMissingNames();
  };
  window.addEventListener("online", flushNow);
  window.addEventListener("focus", flushNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") flushNow();
  });

  // Açılışta tek seferlik temizlik: eski mükerrer kişiler tek satıra iner.
  await purgeStaleConversations();
  await cleanDuplicateConversations();
  await refreshConversations();
  await startNode();
  // Eşler tanışınca eksik mesajlar arka planda eşitlenir.
  setInterval(() => {
    if (knownPeerIds().length) void announceDigests();
  }, 30_000);
  setTimeout(() => void announceDigests(), 4_000);
  // Ad uyumu: adımızı duyur, adı bilinmeyenlerden ad iste.
  setTimeout(() => {
    void announceName();
    void requestMissingNames();
  }, 6_000);
  setInterval(() => void requestMissingNames(), 45_000);
  // Açılış sağlık denetimi ve otonom onarım.
  void import("@/lib/chat/self-heal")
    .then((m) => m.runSelfHeal())
    .catch((error: unknown) => console.error("[chat] sağlık denetimi başarısız", error));

  // Sürüm kilidi: yeni sürümde eski önbellek kalıntıları bir kez temizlenir.
  void import("@/lib/chat/version-lock")
    .then((m) => m.applyVersionLock())
    .catch(() => undefined);

  // SÜREKLİ BUDAMA: hayalet kayıtlar yalnızca açılışta değil, sekme öne
  // alındığında ve ağ geri geldiğinde de temizlenir.
  const sweep = () =>
    void import("@/lib/chat/merge")
      .then((m) => m.sweepGhosts())
      .catch(() => undefined);
  window.addEventListener("online", sweep);
  window.addEventListener("focus", sweep);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") sweep();
  });
  setInterval(sweep, 60_000);
}


/** Süresi dolan (kaybolan) mesajları siler ve arayüzü tazeler. */
export async function sweepEphemeral(): Promise<number> {
  const n = await sweepExpired((id) => deleteMessageRecord(id));
  if (n) {
    await refreshConversations();
    for (const convId of Object.keys(state.messages)) await refreshMessages(convId);
  }
  return n;
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
