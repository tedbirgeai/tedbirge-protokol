/**
 * ARAMA GEÇMİŞİ
 * ------------------------------------------------------------------
 * Gelen / giden / cevapsız aramalar yalnızca bu cihazda saklanır ve
 * ilgili sohbete sistem mesajı olarak da yazılır. Kayıtlar hiçbir
 * sunucuya gönderilmez (KVKK: trafik verisi cihazda kalır).
 */

const KEY = "tedbirge.chat.calllog";
const MAX = 300;

export type CallDirection = "incoming" | "outgoing" | "missed";

export type CallRecord = {
  id: string;
  ts: number;
  peerId: string;
  convId?: string;
  direction: CallDirection;
  video: boolean;
  /** Saniye cinsinden görüşme süresi (cevapsızda 0). */
  seconds: number;
};

let cache: CallRecord[] | null = null;
const listeners = new Set<() => void>();

function read(): CallRecord[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as CallRecord[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(rows: CallRecord[]) {
  cache = rows.slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
}

export function onCallLogChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listCalls(): CallRecord[] {
  return read();
}

export function clearCallLog() {
  write([]);
}

export function durationLabel(seconds: number): string {
  if (seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} dk ${s} sn` : `${s} sn`;
}

export function callSummary(rec: CallRecord): string {
  const type = rec.video ? "Görüntülü arama" : "Sesli arama";
  if (rec.direction === "missed") return `📞 Cevapsız ${type.toLowerCase()}`;
  const dir = rec.direction === "incoming" ? "Gelen" : "Giden";
  const dur = durationLabel(rec.seconds);
  return `📞 ${dir} ${type.toLowerCase()}${dur ? ` · ${dur}` : ""}`;
}

/** Kaydı ekler ve sohbete sistem mesajı yazar. */
export async function logCall(input: Omit<CallRecord, "id" | "ts">): Promise<CallRecord> {
  const rec: CallRecord = {
    ...input,
    id: `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  };
  write([rec, ...read()]);
  try {
    // HAYALET SATIR ÖNLEME: adı çözülemeyen eş için sohbet AÇILMAZ.
    // Kayıt yalnızca arama geçmişinde durur; ad sonradan öğrenilirse
    // bir sonraki aramada sohbet gerçek adıyla oluşur.
    const { resolveDisplayName } = await import("@/lib/chat/name-resolver");
    if (!rec.convId && !resolveDisplayName(rec.peerId).trim()) return rec;
    const { addSystemMessage, ensureDirectConversation } = await import("@/lib/chat/engine");
    const convId = rec.convId ?? (await ensureDirectConversation(rec.peerId)).id;
    await addSystemMessage(convId, callSummary(rec));
  } catch {
    /* sohbet henüz yoksa yalnızca geçmişte durur */
  }

  return rec;
}

/**
 * Başka bir cihazdan gelen arama kayıtlarını birleştirir (kimliğe göre
 * tekilleştirir, aynı kayıt iki kez görünmez).
 */
export function mergeCallRecords(incoming: CallRecord[]): number {
  if (!incoming?.length) return 0;
  const byId = new Map<string, CallRecord>();
  for (const rec of [...read(), ...incoming]) {
    if (!rec?.id) continue;
    const existing = byId.get(rec.id);
    if (!existing || rec.seconds > existing.seconds) byId.set(rec.id, rec);
  }
  const merged = Array.from(byId.values()).sort((a, b) => b.ts - a.ts);
  write(merged);
  return merged.length;
}

/**
 * HAYALET ARAMA KAYDI TEMİZLİĞİ.
 * Adı çözülemeyen ("Tedbirge kullanıcısı") ya da kendi diğer cihazıma ait
 * arama kayıtları listede hayalet satır üretiyordu. Bu kayıtlar açılışta
 * budanır; kişi adı sonradan öğrenilirse yeni aramalarla geri gelir.
 */
export async function pruneCallLog(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const rows = read();
  if (rows.length === 0) return 0;
  const { resolveDisplayName, isSelfPerson, nameKeyOf, resolvePhoneHash } =
    await import("@/lib/chat/name-resolver");
  const { isTechnicalLabel } = await import("@/lib/chat/display-name");
  const kept = rows.filter((rec) => {
    const peer = rec.peerId ?? "";
    if (!peer) return false;
    const resolved = resolveDisplayName(peer).trim();
    if (!resolved || isTechnicalLabel(resolved)) return false;
    return !isSelfPerson({
      id: peer,
      personId: nameKeyOf(peer),
      phoneHash: resolvePhoneHash(peer),
      name: resolveDisplayName(peer),
    });
  });
  const removed = rows.length - kept.length;
  if (removed > 0) write(kept);
  return removed;
}
