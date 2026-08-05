/**
 * SON GÖRÜLME
 * ------------------------------------------------------------------
 * Eşlerin en son görüldüğü an cihazda tutulur. Gizlilik ayarından
 * kapatıldığında hem kendi durumumuz paylaşılmaz hem de karşı tarafın
 * son görülme bilgisi gösterilmez (WhatsApp karşılıklılık ilkesi).
 */

const KEY = "tedbirge.chat.lastseen";

type SeenMap = Record<string, number>;

let cache: SeenMap | null = null;
const listeners = new Set<() => void>();

function read(): SeenMap {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as SeenMap;
  } catch {
    cache = {};
  }
  return cache;
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cache ?? {}));
    } catch {
      /* gizli mod */
    }
    listeners.forEach((l) => l());
  }, 1_000);
}

export function onLastSeenChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function markSeen(peerId: string, ts = Date.now()): void {
  if (!peerId) return;
  const map = read();
  if ((map[peerId] ?? 0) > ts - 30_000) return;
  map[peerId] = ts;
  cache = map;
  schedulePersist();
}

export function lastSeenAt(peerId: string): number | null {
  return read()[peerId] ?? null;
}

/** "bugün 14:32" / "dün 09:10" / "12 Mart 08:05" */
export function lastSeenLabel(peerId: string): string {
  const ts = lastSeenAt(peerId);
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `son görülme bugün ${time}`;
  const yest = new Date(now.getTime() - 86_400_000);
  if (d.toDateString() === yest.toDateString()) return `son görülme dün ${time}`;
  return `son görülme ${d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long" })} ${time}`;
}
