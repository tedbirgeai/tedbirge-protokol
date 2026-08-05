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
    const { addSystemMessage, ensureDirectConversation } = await import("@/lib/chat/engine");
    const convId = rec.convId ?? (await ensureDirectConversation(rec.peerId)).id;
    await addSystemMessage(convId, callSummary(rec));
  } catch {
    /* sohbet henüz yoksa yalnızca geçmişte durur */
  }
  return rec;
}
