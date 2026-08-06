/**
 * SOHBET İŞARETLERİ — favori ve "okunmadı" damgası.
 * ------------------------------------------------------------------
 * Yalnızca bu cihazda saklanır; hiçbir sunucuya gönderilmez.
 * Arşiv ve listeler `folders.ts` içinde yönetilir.
 */

const KEY = "tedbirge.chat.flags";

export type ChatFlags = {
  /** Favori sohbet kimlikleri. */
  favorites: string[];
  /** Elle "okunmadı" işaretlenmiş sohbetler. */
  unread: string[];
};

const EMPTY: ChatFlags = { favorites: [], unread: [] };

let cache: ChatFlags | null = null;
const listeners = new Set<() => void>();

function persist(next: ChatFlags) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
}

export function getFlags(): ChatFlags {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<ChatFlags>;
    cache = { favorites: raw.favorites ?? [], unread: raw.unread ?? [] };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

export function onFlagsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isFavorite(convId: string): boolean {
  return getFlags().favorites.includes(convId);
}

export function toggleFavorite(convId: string) {
  const s = getFlags();
  const favorites = s.favorites.includes(convId)
    ? s.favorites.filter((id) => id !== convId)
    : [...s.favorites, convId];
  persist({ ...s, favorites });
}

export function isMarkedUnread(convId: string): boolean {
  return getFlags().unread.includes(convId);
}

export function markUnreadFlag(convId: string) {
  const s = getFlags();
  if (s.unread.includes(convId)) return;
  persist({ ...s, unread: [...s.unread, convId] });
}

export function clearUnreadFlag(convId: string) {
  const s = getFlags();
  if (!s.unread.includes(convId)) return;
  persist({ ...s, unread: s.unread.filter((id) => id !== convId) });
}

/** Sohbet silindiğinde işaretleri de temizler. */
export function forgetFlags(convId: string) {
  const s = getFlags();
  persist({
    favorites: s.favorites.filter((id) => id !== convId),
    unread: s.unread.filter((id) => id !== convId),
  });
}
