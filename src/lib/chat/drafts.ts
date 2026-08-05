/**
 * KALICI TASLAKLAR
 * ------------------------------------------------------------------
 * Sohbetten çıkıp geri dönüldüğünde yazılmakta olan metin kaybolmaz.
 * Taslak yalnızca bu cihazda saklanır.
 */

const KEY = "tedbirge.chat.drafts";

type Drafts = Record<string, string>;

let cache: Drafts | null = null;

function read(): Drafts {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Drafts;
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: Drafts) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* gizli mod */
  }
}

export function getDraft(convId: string | null): string {
  if (!convId) return "";
  return read()[convId] ?? "";
}

export function setDraft(convId: string | null, text: string) {
  if (!convId) return;
  const next = { ...read() };
  if (text.trim()) next[convId] = text;
  else delete next[convId];
  write(next);
}

export function clearDraft(convId: string | null) {
  setDraft(convId, "");
}

export function hasDraft(convId: string): boolean {
  return Boolean(read()[convId]);
}
