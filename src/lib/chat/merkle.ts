/**
 * Merkle özet tabanlı çevrimdışı eşitleme.
 * ------------------------------------------------------------------
 * İki cihaz kesintiden sonra kapsama alanına girdiğinde, tüm mesaj
 * geçmişini karşılaştırmak yerine konuşma başına Merkle kök özetini
 * takas eder. Kökler farklıysa yalnızca eksik mesaj kimlikleri
 * istenir; sıfır veri kaybıyla, minimum trafikle eşitlenir.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import type { ChatMessage } from "@/lib/store/idb";

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function leafHash(id: string): string {
  return hex(sha256(new TextEncoder().encode(id))).slice(0, 32);
}

/** Sıralı yaprak listesinden Merkle kökü üretir. */
export function merkleRoot(ids: string[]): string {
  if (!ids.length) return "0".repeat(32);
  let level = [...ids].sort().map(leafHash);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i]!;
      const b = level[i + 1] ?? a;
      next.push(hex(sha256(new TextEncoder().encode(a + b))).slice(0, 32));
    }
    level = next;
  }
  return level[0]!;
}

export type ConvDigest = { convId: string; root: string; count: number };

export function digestsOf(messages: ChatMessage[]): ConvDigest[] {
  const byConv = new Map<string, string[]>();
  for (const m of messages) {
    const list = byConv.get(m.convId) ?? [];
    list.push(m.id);
    byConv.set(m.convId, list);
  }
  return Array.from(byConv.entries()).map(([convId, ids]) => ({
    convId,
    root: merkleRoot(ids),
    count: ids.length,
  }));
}

export type SyncMessage =
  | { t: "digest"; digests: ConvDigest[] }
  | { t: "ids"; convId: string; ids: string[] }
  | { t: "want"; convId: string; ids: string[] }
  | { t: "give"; messages: ChatMessage[] };

export function isSyncMessage(v: unknown): v is SyncMessage {
  const s = v as SyncMessage | null;
  return Boolean(s && typeof (s as { t?: string }).t === "string");
}
