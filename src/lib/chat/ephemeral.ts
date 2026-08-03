/**
 * Kaybolan mesajlar — sohbet başına süreli imha.
 * ------------------------------------------------------------------
 * Süre ayarı yerel olarak saklanır ve gönderilen her mesajın zarfında
 * `ttlMs` olarak taşınır; alıcı da aynı süreyi uygular. Süresi dolan
 * mesaj IndexedDB'den fiziksel olarak silinir (yalnızca gizlenmez).
 */

import { listAllMessages, putConversation, getConversation } from "@/lib/store/idb";

const KEY = "tedbirge.chat.ephemeral";

export const TTL_OPTIONS = [
  { ms: 0, label: "Kapalı" },
  { ms: 3_600_000, label: "1 saat" },
  { ms: 86_400_000, label: "24 saat" },
  { ms: 7 * 86_400_000, label: "7 gün" },
  { ms: 90 * 86_400_000, label: "90 gün" },
] as const;

function readMap(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function ttlOf(convId: string): number {
  return readMap()[convId] ?? 0;
}

export function setTtl(convId: string, ms: number) {
  const map = readMap();
  if (ms > 0) map[convId] = ms;
  else delete map[convId];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* gizli mod */
  }
}

export function ttlLabel(ms: number): string {
  return TTL_OPTIONS.find((o) => o.ms === ms)?.label ?? "Kapalı";
}

/** Süresi dolan mesajları siler; silinen sayısını döner. */
export async function sweepExpired(remove: (id: string) => Promise<unknown>): Promise<number> {
  const now = Date.now();
  const all = await listAllMessages();
  let n = 0;
  const touched = new Set<string>();
  for (const m of all) {
    const expires = m.expiresAt ?? 0;
    if (!expires || expires > now) continue;
    await remove(m.id);
    touched.add(m.convId);
    n += 1;
  }
  for (const convId of touched) {
    const conv = await getConversation(convId);
    if (conv) await putConversation({ ...conv, lastText: "" });
  }
  return n;
}
