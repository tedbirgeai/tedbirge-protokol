/**
 * Mesaj arama — cihaz içi tam metin taraması.
 * ------------------------------------------------------------------
 * Tüm mesajlar zaten IndexedDB'de olduğundan arama çevrimdışı çalışır
 * ve hiçbir sorgu cihazdan çıkmaz. Türkçe karakterler normalize edilir.
 */

import { listAllMessages, listConversations, type ChatMessage } from "@/lib/store/idb";

export type SearchHit = {
  message: ChatMessage;
  convId: string;
  convTitle: string;
  /** Eşleşen bölümün kısa önizlemesi. */
  snippet: string;
};

export function normalize(v: string): string {
  return v
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

function snippetOf(text: string, needle: string): string {
  const i = normalize(text).indexOf(needle);
  if (i < 0) return text.slice(0, 90);
  const start = Math.max(0, i - 30);
  return `${start > 0 ? "…" : ""}${text.slice(start, start + 100)}${text.length > start + 100 ? "…" : ""}`;
}

/** Tüm sohbetlerde arar; `convId` verilirse yalnızca o sohbette. */
export async function searchMessages(
  query: string,
  options?: { convId?: string; starredOnly?: boolean; limit?: number },
): Promise<SearchHit[]> {
  const q = normalize(query);
  const starredOnly = options?.starredOnly ?? false;
  if (!q && !starredOnly) return [];
  const [all, convs] = await Promise.all([listAllMessages(), listConversations()]);
  const titles = new Map(convs.map((c) => [c.id, c.title]));
  const hits: SearchHit[] = [];
  for (const m of all) {
    if (options?.convId && m.convId !== options.convId) continue;
    if (starredOnly && !m.starred) continue;
    if (m.deleted) continue;
    const hay = m.kind === "media" ? (m.media?.name ?? "") : m.text;
    if (q && !normalize(hay).includes(q)) continue;
    hits.push({
      message: m,
      convId: m.convId,
      convTitle: titles.get(m.convId) ?? "Sohbet",
      snippet: snippetOf(hay, q),
    });
  }
  return hits.sort((a, b) => b.message.ts - a.message.ts).slice(0, options?.limit ?? 200);
}
