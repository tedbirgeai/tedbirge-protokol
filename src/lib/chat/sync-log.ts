/**
 * EŞİTLEME GÜNLÜĞÜ — son 20 olay, zaman damgalı.
 * ------------------------------------------------------------------
 * Eşitleme zincirinin her halkası (bulut oturumu → paket yazma → paket
 * okuma → çözme → yerele yazma → arayüz yenileme) buraya kaydedilir.
 * Sessiz hata yasaktır: her başarısız adım kullanıcıya Türkçe ve
 * jargonsuz bir satır olarak görünür.
 */

const KEY = "tedbirge.sync.log";
const MAX = 20;

export type SyncLogLevel = "bilgi" | "uyarı" | "hata";

export type SyncLogEntry = {
  at: number;
  level: SyncLogLevel;
  step: string;
  detail: string;
};

let entries: SyncLogEntry[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load(): SyncLogEntry[] {
  if (loaded || typeof window === "undefined") return entries;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    entries = raw ? (JSON.parse(raw) as SyncLogEntry[]) : [];
  } catch {
    entries = [];
  }
  return entries;
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* gizli mod / kota */
  }
}

/** Günlüğe bir satır yazar ve dinleyicileri uyarır. */
export function logSync(level: SyncLogLevel, step: string, detail = ""): void {
  if (typeof window === "undefined") return;
  load();
  entries = [{ at: Date.now(), level, step, detail }, ...entries].slice(0, MAX);
  persist();
  listeners.forEach((l) => l());
}

export function getSyncLog(): SyncLogEntry[] {
  return load();
}

export function clearSyncLog(): void {
  entries = [];
  loaded = true;
  persist();
  listeners.forEach((l) => l());
}

export function onSyncLogChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
