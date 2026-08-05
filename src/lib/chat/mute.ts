/**
 * SOHBET BAZLI SESSİZE ALMA
 * ------------------------------------------------------------------
 * WhatsApp modeli: 8 saat / 1 hafta / süresiz. Tercih yalnızca bu
 * cihazda saklanır, hiçbir sunucuya gitmez. Sessize alınmış sohbette
 * bildirim ve ses çalınmaz; rozet gösterilmeye devam eder.
 */

const KEY = "tedbirge.chat.mute";

export type MuteChoice = "8h" | "1w" | "forever";

export const MUTE_OPTIONS: { id: MuteChoice; label: string; ms: number }[] = [
  { id: "8h", label: "8 saat", ms: 8 * 3_600_000 },
  { id: "1w", label: "1 hafta", ms: 7 * 86_400_000 },
  { id: "forever", label: "Süresiz", ms: 0 },
];

/** convId → bitiş zamanı (0 = süresiz). */
type MuteMap = Record<string, number>;

let cache: MuteMap | null = null;
const listeners = new Set<() => void>();

function read(): MuteMap {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as MuteMap;
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: MuteMap) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
}

export function onMuteChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isMuted(convId: string): boolean {
  const until = read()[convId];
  if (until === undefined) return false;
  if (until === 0) return true;
  if (until > Date.now()) return true;
  const next = { ...read() };
  delete next[convId];
  write(next);
  return false;
}

export function muteUntilLabel(convId: string): string {
  const until = read()[convId];
  if (until === undefined) return "";
  if (until === 0) return "Süresiz sessiz";
  return `${new Date(until).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })} tarihine kadar sessiz`;
}

export function muteConversation(convId: string, choice: MuteChoice) {
  const opt = MUTE_OPTIONS.find((o) => o.id === choice) ?? MUTE_OPTIONS[0]!;
  write({ ...read(), [convId]: opt.ms === 0 ? 0 : Date.now() + opt.ms });
}

export function unmuteConversation(convId: string) {
  const next = { ...read() };
  delete next[convId];
  write(next);
}
