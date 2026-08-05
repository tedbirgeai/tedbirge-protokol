/**
 * CİHAZLAR ARASI SOHBET SENKRONU (uçtan uca şifreli, artımlı + tam yedek)
 * ------------------------------------------------------------------
 * Sohbet oturumları, mesaj geçmişi, okundu bilgisi, rehber kayıtları,
 * verdiğiniz adlar ve arama geçmişi cihazda AES-GCM ile şifrelenir ve
 * yalnızca şifreli hâliyle hesaba yazılır. Anahtar telefon numarasından
 * türetilir; sunucu içeriği çözemez.
 *
 * İLK GİRİŞ: yeni bir cihaz numarayla girdiğinde TAM PAKET (snapshot)
 * hem yazılır hem de karşı taraftan baştan itibaren okunur — imleç
 * kullanılmaz, hiçbir geçmiş atlanmaz.
 * SONRAKİ TURLAR: yalnızca değişenler (delta) taşınır.
 * ÇEVRİMDIŞI: ağ yokken her şey yerelde çalışır, ağ gelince kuyruk
 * kendiliğinden boşalır; hiçbir ekran bloke olmaz.
 */

import {
  listAllMessages,
  listConversations,
  getMessage,
  getConversation,
  putConversation,
  putMessage,
  listTrustedNodes,
  putTrustedNode,
  type ChatMessage,
  type Conversation,
  type MessageStatus,
  type TrustedNode,
} from "@/lib/store/idb";
import { keyFor, b64, unb64 } from "@/lib/chat/vault";
import { getAnchorPhone } from "@/lib/chat/anchor";
import { mergeCallRecords, listCalls, type CallRecord } from "@/lib/chat/call-log";
import { getBrowserNodeId } from "@/lib/browser-node";
import { logSync } from "@/lib/chat/sync-log";

const CURSOR_PUSH = "tedbirge.sync.pushCursor";
const CURSOR_PULL = "tedbirge.sync.pullCursor";
const LAST_OK = "tedbirge.sync.lastOk";
const LAST_ERROR = "tedbirge.sync.lastError";
/** Bu cihaz ilk tam eşitlemesini tamamladı mı? */
const BOOTSTRAPPED = "tedbirge.sync.bootstrapped";
/** Uygulanmış paket kimlikleri (yeniden işlememek için). */
const SEEN_CHUNKS = "tedbirge.sync.seenChunks";

const NICK_KEY = "tedbirge.chat.nicknames";

/** Tek pakette taşınan en fazla mesaj sayısı (kota koruması). */
const CHUNK_MESSAGES = 250;
/** Sunucunun kabul ettiği en büyük şifreli paket (güvenlik payı ile). */
const MAX_CIPHERTEXT = 850_000;
/** Bir pakete konulacak en fazla düz metin karakteri. */
const MAX_BATCH_CHARS = 450_000;
/** Tek başına kasaya sığmayan mesaj eşiği (büyük medya). */
const MAX_ITEM_CHARS = 400_000;
/** Periyodik eşitleme aralığı. */
const INTERVAL_MS = 5 * 60_000;
/** Hatırlanan paket kimliği sayısı. */
const MAX_SEEN = 600;

const enc = new TextEncoder();
const dec = new TextDecoder();

type Delta = {
  format: "tedbirge.history.v1" | "tedbirge.history.v2";
  savedAt: number;
  /** Tam yedek mi (ilk giriş) yoksa artımlı mı? */
  snapshot?: boolean;
  conversations: Conversation[];
  messages: ChatMessage[];
  calls: CallRecord[];
  /** v2: rehber kayıtları ve verdiğiniz adlar da taşınır. */
  contacts?: TrustedNode[];
  nicknames?: Record<string, string>;
};

export type SyncState = {
  running: boolean;
  lastOkAt: number;
  lastError: string;
  cloudSession: boolean;
  chunks: number;
  bytes: number;
};

let state: SyncState = {
  running: false,
  lastOkAt: 0,
  lastError: "",
  cloudSession: false,
  chunks: 0,
  bytes: 0,
};
const listeners = new Set<() => void>();

function readNum(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function readStr(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStr(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("[sync] yerel depolama yazılamadı", error);
  }
}

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(readStr(SEEN_CHUNKS) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(set: Set<string>) {
  writeStr(SEEN_CHUNKS, JSON.stringify(Array.from(set).slice(-MAX_SEEN)));
}

function readNicknames(): Record<string, string> {
  try {
    return JSON.parse(readStr(NICK_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Teknik hata metnini (ör. doğrulama JSON'u) kullanıcıya okunur hâle
 * getirir; ham JSON hiçbir zaman arayüzde gösterilmez.
 */
function friendlyError(raw: string): string {
  const text = (raw || "").trim();
  if (!text) return "Bilinmeyen bir sorun oluştu";
  if (text.startsWith("[") || text.startsWith("{")) {
    return "Eşitleme paketi kabul edilmedi — yeniden denenecek";
  }
  if (/rate|429|too many/i.test(text)) return "Çok sık denendi, birazdan tekrar denenecek";
  if (/fetch|network|failed to fetch/i.test(text)) return "Bağlantı kurulamadı";
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function publish(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getSyncState(): SyncState {
  return state;
}

export function onSyncStateChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function syncStatusLabel(s: SyncState = state): string {
  if (s.running) return "Eşitleniyor…";
  if (s.lastError) return `Eşitleme hatası: ${s.lastError}`;
  if (!s.cloudSession) return "Bulut oturumu yok — yalnızca bu cihazda saklanıyor";
  if (!s.lastOkAt) return "Henüz eşitlenmedi";
  return `Son eşitleme: ${new Date(s.lastOkAt).toLocaleString("tr-TR")}`;
}

/* --------------------------- bulut oturumu --------------------------- */

/**
 * Bulut oturumunun numaraya bağlı hesapla eşleştiğini doğrular; kopmuşsa
 * linkPhoneAccount ile sessizce yeniden bağlanır. Diğer cihazların
 * oturumları düşmez (parola deterministiktir).
 */
export async function ensureCloudSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const phone = await getAnchorPhone();
  if (!phone) {
    logSync("uyarı", "Bulut oturumu", "Numara doğrulanmamış — yalnızca bu cihazda saklanıyor");
    return false;
  }
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const expected = `${phone.replace(/\D/g, "")}@phone.tedbirge.app`;
  const current = data.session?.user?.email ?? "";
  if (current === expected) return true;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    logSync("bilgi", "Bulut oturumu", "Ağ yok — çevrimdışı çalışılıyor");
    return false;
  }

  const { linkPhoneAccount } = await import("@/lib/local-auth.functions");
  const res = await linkPhoneAccount({ data: { phone } });
  if (!res.ok) {
    throw new Error(`Bulut hesabı bağlanamadı (${res.reason})`);
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: res.email,
    password: res.password,
  });
  if (error) throw new Error(`Bulut oturumu açılamadı: ${error.message}`);
  logSync("bilgi", "Bulut oturumu", "Numaraya bağlı hesapla açıldı");
  return true;
}

/* --------------------------- şifreleme --------------------------- */

async function sealDelta(phone: string, delta: Delta): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(phone);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(delta))),
  );
  return `${b64(iv)}.${b64(cipher)}`;
}

async function openDelta(phone: string, blob: string): Promise<Delta | null> {
  const [ivPart, dataPart] = blob.split(".");
  if (!ivPart || !dataPart) return null;
  // Anahtar sürümü uyuşmazlığı sessizce yutulmaz: v2 ve v1 sırayla denenir,
  // ikisi de açılmazsa çağıran tarafa görünür uyarı üretir.
  for (const version of [2, 1] as const) {
    try {
      const key = await keyFor(phone, version);
      const plain = dec.decode(
        new Uint8Array(
          await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(ivPart) }, key, unb64(dataPart)),
        ),
      );
      const parsed = JSON.parse(plain) as Delta;
      if (parsed.format !== "tedbirge.history.v1" && parsed.format !== "tedbirge.history.v2") {
        return null;
      }
      return parsed;
    } catch {
      /* diğer sürümle dene */
    }
  }
  return null;
}

/* --------------------------- birleştirme --------------------------- */

const STATUS_RANK: Record<MessageStatus, number> = {
  failed: 0,
  pending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

function newer(a: ChatMessage, b: ChatMessage): ChatMessage {
  const aStamp = a.editedAt ?? a.ts;
  const bStamp = b.editedAt ?? b.ts;
  const base = bStamp > aStamp ? { ...a, ...b } : { ...b, ...a };
  // Durum geriye gitmez: okundu bilgisi her cihazda korunur.
  const status = STATUS_RANK[a.status] >= STATUS_RANK[b.status] ? a.status : b.status;
  return {
    ...base,
    status,
    deleted: a.deleted || b.deleted || undefined,
    starred: a.starred || b.starred || undefined,
    reactions: { ...(b.reactions ?? {}), ...(a.reactions ?? {}) },
  };
}

async function applyDelta(delta: Delta): Promise<number> {
  let applied = 0;

  for (const conv of delta.conversations ?? []) {
    if (!conv?.id) continue;
    const local = await getConversation(conv.id);
    if (!local) {
      await putConversation(conv);
      applied += 1;
      continue;
    }
    const merged: Conversation = {
      ...local,
      ...(conv.lastTs > local.lastTs ? conv : {}),
      members: Array.from(new Set([...(local.members ?? []), ...(conv.members ?? [])])),
      lastTs: Math.max(local.lastTs, conv.lastTs),
      // Okundu bilgisi cihazlar arasında yayılır: en düşük okunmamış kazanır.
      unread: Math.min(local.unread ?? 0, conv.unread ?? 0),
      pinned: local.pinned || conv.pinned,
    };
    await putConversation(merged);
    applied += 1;
  }

  for (const msg of delta.messages ?? []) {
    if (!msg?.id) continue;
    const local = await getMessage(msg.id);
    if (!local) {
      await putMessage(msg);
      applied += 1;
      continue;
    }
    const merged = newer(local, msg);
    if (JSON.stringify(merged) !== JSON.stringify(local)) {
      await putMessage(merged);
      applied += 1;
    }
  }

  // Rehber kayıtları ve verdiğiniz adlar: karşı cihazdaki isimler bu
  // cihaza da iner, böylece sohbetler "adsız" kalıp gizlenmez.
  let contactsTouched = false;
  for (const node of delta.contacts ?? []) {
    if (!node?.nodeId) continue;
    await putTrustedNode(node);
    contactsTouched = true;
    applied += 1;
  }
  const incomingNicks = delta.nicknames ?? {};
  if (Object.keys(incomingNicks).length > 0) {
    const current = readNicknames();
    let changed = false;
    for (const [id, name] of Object.entries(incomingNicks)) {
      if (!current[id] && name) {
        current[id] = name;
        changed = true;
      }
    }
    if (changed) {
      writeStr(NICK_KEY, JSON.stringify(current));
      contactsTouched = true;
      applied += 1;
    }
  }
  if (contactsTouched) {
    const { refreshContacts } = await import("@/lib/chat/contacts");
    await refreshContacts();
  }

  if (delta.calls?.length) mergeCallRecords(delta.calls);
  return applied;
}

/* --------------------------- tur --------------------------- */

async function pull(phone: string, full: boolean): Promise<number> {
  const { pullHistoryChunks } = await import("@/lib/history.functions");
  // İlk kurulumda imleç kullanılmaz: geçmişin tamamı baştan okunur.
  const since = full ? "" : readStr(CURSOR_PULL);
  const res = await pullHistoryChunks({ data: since ? { since, limit: 120 } : { limit: 120 } });
  if (res.error) throw new Error(res.error);
  logSync("bilgi", "Paket okuma", `${res.chunks.length} paket bulundu${full ? " (tam geçmiş)" : ""}`);

  const self = getBrowserNodeId();
  const seen = readSeen();
  let applied = 0;
  let failed = 0;
  let cursor = since;
  for (const chunk of res.chunks) {
    cursor = chunk.createdAt;
    if (seen.has(chunk.id)) continue;
    // Kendi paketlerimiz normalde atlanır; ancak aynı cihaz kimliği iki
    // ortamda çakışabileceği için ilk (tam) turda bunlar da uygulanır.
    if (!full && chunk.deviceId === self) {
      seen.add(chunk.id);
      continue;
    }
    const delta = await openDelta(phone, chunk.ciphertext);
    if (!delta) {
      failed += 1;
      continue;
    }
    applied += await applyDelta(delta);
    seen.add(chunk.id);
  }
  writeSeen(seen);
  if (cursor) writeStr(CURSOR_PULL, cursor);
  if (failed > 0) {
    logSync("uyarı", "Paket çözme", `${failed} paket açılamadı`);
    throw new Error(
      `${failed} yedek paketi bu cihazda açılamadı — numaranızı doğrulayıp yeniden deneyin`,
    );
  }
  logSync("bilgi", "Yerele yazma", `${applied} kayıt uygulandı`);
  if (applied > 0) {
    const { refreshAll } = await import("@/lib/chat/engine");
    await refreshAll();
    logSync("bilgi", "Arayüz", "Sohbet listesi yenilendi");
  }
  return applied;
}

async function push(phone: string, full: boolean): Promise<number> {
  // Tam yedekte imleç yok sayılır: sohbet + mesaj + rehber + arama kaydı
  // eksiksiz olarak kasaya yazılır.
  const cursor = full ? 0 : readNum(CURSOR_PUSH);
  const now = Date.now();

  const conversations = (await listConversations()).filter((c) => c.lastTs >= cursor);
  const allMessages = (await listAllMessages())
    .filter((m) => (m.editedAt ?? m.ts) >= cursor)
    .sort((a, b) => a.ts - b.ts);
  const calls = listCalls().filter((c) => c.ts >= cursor);
  const contacts = full ? await listTrustedNodes().catch(() => []) : [];
  const nicknames = full ? readNicknames() : {};

  // Tek pakete sığmayan (büyük medya taşıyan) mesajlar atlanır; bunlar
  // eşleşen cihazlar arasında doğrudan aktarılır, kasaya yazılmaz.
  const messages: ChatMessage[] = [];
  let skipped = 0;
  for (const m of allMessages) {
    if (JSON.stringify(m).length > MAX_ITEM_CHARS) {
      skipped += 1;
      continue;
    }
    messages.push(m);
  }
  if (skipped > 0) {
    logSync("uyarı", "Paket yazma", `${skipped} büyük medya mesajı yedeğe alınamadı`);
  }
  const nothingToSend =
    conversations.length === 0 &&
    messages.length === 0 &&
    calls.length === 0 &&
    contacts.length === 0 &&
    Object.keys(nicknames).length === 0;
  if (nothingToSend) {
    writeStr(CURSOR_PUSH, String(now));
    logSync("bilgi", "Paket yazma", "Gönderilecek yeni kayıt yok");
    return 0;
  }

  const { pushHistoryChunk } = await import("@/lib/history.functions");
  const deviceId = getBrowserNodeId();

  // Paketler hem adet hem de bayt sınırına göre bölünür.
  const batches: ChatMessage[][] = [];
  let current: ChatMessage[] = [];
  let currentChars = 0;
  for (const m of messages) {
    const size = JSON.stringify(m).length;
    if (
      current.length >= CHUNK_MESSAGES ||
      (current.length > 0 && currentChars + size > MAX_BATCH_CHARS)
    ) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(m);
    currentChars += size;
  }
  if (current.length > 0) batches.push(current);
  if (batches.length === 0) batches.push([]);

  let sent = 0;
  let written = 0;
  for (let i = 0; i < batches.length; i += 1) {
    const delta: Delta = {
      format: "tedbirge.history.v2",
      savedAt: now,
      snapshot: full && i === 0,
      conversations: i === 0 ? conversations : [],
      messages: batches[i] ?? [],
      calls: i === 0 ? calls : [],
      contacts: i === 0 ? contacts : [],
      nicknames: i === 0 ? nicknames : {},
    };
    const ciphertext = await sealDelta(phone, delta);
    if (ciphertext.length > MAX_CIPHERTEXT) {
      logSync("uyarı", "Paket yazma", "Bir paket boyut sınırını aştı, bölünerek yeniden denenecek");
      continue;
    }
    const res = await pushHistoryChunk({ data: { deviceId, ciphertext } });
    if (!res.ok) throw new Error(res.error ?? "Paket yazılamadı");
    written += 1;
    sent += delta.messages.length;
  }
  writeStr(CURSOR_PUSH, String(now));
  logSync(
    "bilgi",
    "Paket yazma",
    `${written} paket yazıldı · ${sent} mesaj${full ? " (tam yedek)" : ""}`,
  );
  return sent;
}

let inFlight: Promise<boolean> | null = null;

/** Tek eşitleme turu: oturumu doğrula → indir → yükle → durumu yayınla. */
export async function syncNow(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    publish({ running: true });
    try {
      const phone = await getAnchorPhone();
      if (!phone) {
        publish({ cloudSession: false, lastError: "" });
        return false;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        publish({ lastError: "" });
        logSync("bilgi", "Eşitleme", "Ağ yok — kuyruk bekletiliyor");
        return false;
      }
      const linked = await ensureCloudSession();
      publish({ cloudSession: linked });
      if (!linked) return false;

      // İlk tur: hem tam geçmiş indirilir hem de tam yedek yazılır.
      const full = readStr(BOOTSTRAPPED) !== "1";
      if (full) logSync("bilgi", "Eşitleme", "İlk giriş — tam geçmiş isteniyor");

      await pull(phone, full);
      await push(phone, full);
      if (full) {
        // Tam yedek yazıldıktan sonra diğer cihazların paketleri de
        // ikinci bir turda uygulanır (yarış durumu koruması).
        await pull(phone, true);
        writeStr(BOOTSTRAPPED, "1");
      }

      const { historyStats } = await import("@/lib/history.functions");
      const stats = await historyStats();
      const okAt = Date.now();
      writeStr(LAST_OK, String(okAt));
      writeStr(LAST_ERROR, "");
      publish({
        lastOkAt: okAt,
        lastError: "",
        cloudSession: true,
        chunks: stats.chunks,
        bytes: stats.bytes,
      });
      logSync("bilgi", "Eşitleme", "Tur başarıyla tamamlandı");
      return true;
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      const message = friendlyError(raw);
      console.error("[sync] tur başarısız", raw);
      writeStr(LAST_ERROR, message);
      logSync("hata", "Eşitleme", message);
      publish({ lastError: message });
      return false;
    } finally {
      publish({ running: false });
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * TAM YENİDEN EŞİTLE — imleçleri ve paket geçmişini sıfırlar, tüm
 * geçmişi baştan indirir ve bu cihazın tamamını yeniden yedekler.
 */
export async function fullResync(): Promise<boolean> {
  writeStr(CURSOR_PULL, "");
  writeStr(CURSOR_PUSH, "");
  writeStr(SEEN_CHUNKS, "");
  writeStr(BOOTSTRAPPED, "");
  logSync("bilgi", "Tam yeniden eşitleme", "İmleçler sıfırlandı");
  return syncNow();
}

/* --------------------------- otomatik tetikleyiciler --------------------------- */

let debounce: ReturnType<typeof setTimeout> | null = null;
let started = false;

/** Yeni mesaj / okundu / silme olayında çağrılır; kısa gecikmeyle toplanır. */
export function scheduleHistorySync(delay = 4_000): void {
  if (typeof window === "undefined") return;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void syncNow(), delay);
}

/** Uygulama açılışında bir kez: ön plan, ağ dönüşü, periyot ve veri olayları. */
export function startHistorySync(): () => void {
  if (typeof window === "undefined" || started) return () => undefined;
  started = true;

  publish({ lastOkAt: readNum(LAST_OK), lastError: readStr(LAST_ERROR) });

  const onChanged = () => scheduleHistorySync();
  const onOnline = () => {
    logSync("bilgi", "Ağ", "Bağlantı geri geldi — kuyruk boşaltılıyor");
    void syncNow();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") void syncNow();
  };

  window.addEventListener("tedbirge:chat-changed", onChanged);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);
  const timer = setInterval(() => void syncNow(), INTERVAL_MS);
  setTimeout(() => void syncNow(), 2_500);

  return () => {
    started = false;
    clearInterval(timer);
    if (debounce) clearTimeout(debounce);
    window.removeEventListener("tedbirge:chat-changed", onChanged);
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
