/**
 * Sohbet klasörleri ve arşiv — cihaz içi düzenleme katmanı.
 * ------------------------------------------------------------------
 * Klasör bilgisi hiçbir yere gönderilmez; yalnızca bu cihazdaki liste
 * görünümünü etkiler. Arşiv, "Arşiv" adlı yerleşik klasördür.
 */

const KEY = "tedbirge.chat.folders";

export const ARCHIVE = "__archive__";

export type FolderState = {
  /** convId → klasör adı (ARCHIVE veya kullanıcı klasörü). */
  assign: Record<string, string>;
  /** Kullanıcının oluşturduğu klasör adları. */
  names: string[];
};

const EMPTY: FolderState = { assign: {}, names: [] };

let cache: FolderState | null = null;
const listeners = new Set<() => void>();

function persist(state: FolderState) {
  cache = state;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
}

export function getFolders(): FolderState {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<FolderState>;
    cache = { assign: raw.assign ?? {}, names: raw.names ?? [] };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

export function onFoldersChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function folderOf(convId: string): string | null {
  return getFolders().assign[convId] ?? null;
}

export function isArchived(convId: string): boolean {
  return folderOf(convId) === ARCHIVE;
}

export function assignFolder(convId: string, folder: string | null) {
  const s = getFolders();
  const assign = { ...s.assign };
  if (folder) assign[convId] = folder;
  else delete assign[convId];
  persist({ ...s, assign });
}

export function toggleArchive(convId: string) {
  assignFolder(convId, isArchived(convId) ? null : ARCHIVE);
}

export function createFolder(name: string) {
  const clean = name.trim().slice(0, 24);
  if (!clean) return;
  const s = getFolders();
  if (s.names.includes(clean)) return;
  persist({ ...s, names: [...s.names, clean] });
}

export function removeFolder(name: string) {
  const s = getFolders();
  const assign = { ...s.assign };
  for (const [k, v] of Object.entries(assign)) if (v === name) delete assign[k];
  persist({ assign, names: s.names.filter((n) => n !== name) });
}

/** Görünür sekmeler: Tümü + kullanıcı klasörleri + Arşiv. */
export function folderTabs(): { id: string; label: string }[] {
  const s = getFolders();
  return [
    { id: "", label: "Tümü" },
    ...s.names.map((n) => ({ id: n, label: n })),
    { id: ARCHIVE, label: "Arşiv" },
  ];
}
