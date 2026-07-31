/**
 * Öncelik tabanlı budama (Priority Pruning).
 * ------------------------------------------------------------------
 * 30 günlük off-grid hedefinde kuyruk sınırsız büyüyemez. Kota dolmaya
 * başladığında en düşük öncelikli ve en eski paketler silinir:
 *
 *   0 — acil / güvenlik  → ASLA silinmez
 *   1 — kontrol / sinyal → ASLA silinmez
 *   2 — kullanıcı mesajı → son çare
 *   3 — telemetri        → önce budanır
 */

import { countPackets, deletePacket, getPackets, storageInfo, type Priority } from "@/lib/store/idb";

/** Kota bu oranı aşınca budama başlar. */
export const PRUNE_RATIO = 0.85;
/** Depolama kotası okunamadığında kullanılan paket sayısı tavanı. */
export const MAX_PACKETS = 50_000;
/** Budanabilir öncelikler — düşük öncelik önce gider. */
export const PRUNABLE: Priority[] = [3, 2];

export type PruneResult = { removed: number; reason: "none" | "quota" | "count" };

export async function pruneOutbox(): Promise<PruneResult> {
  const [info, count] = await Promise.all([storageInfo(), countPackets()]);
  const quotaPressure = info.quota > 0 && info.ratio > PRUNE_RATIO;
  const countPressure = count > MAX_PACKETS;
  if (!quotaPressure && !countPressure) return { removed: 0, reason: "none" };

  // Hedef: kuyruğun %20'sini (veya sayı tavanının üstünü) boşalt.
  const target = countPressure ? count - Math.floor(MAX_PACKETS * 0.8) : Math.ceil(count * 0.2);
  const rows = await getPackets();
  let removed = 0;

  for (const priority of PRUNABLE) {
    if (removed >= target) break;
    const candidates = rows.filter((r) => r.priority === priority).sort((a, b) => a.ts - b.ts);
    for (const row of candidates) {
      if (removed >= target) break;
      if (await deletePacket(row.pktId)) removed += 1;
    }
  }
  return { removed, reason: countPressure ? "count" : "quota" };
}

/** Kuyruk doluluk özeti — panel göstergeleri için. */
export type QueueHealth = {
  count: number;
  usageMb: number;
  quotaMb: number;
  ratio: number;
  persisted: boolean;
  byPriority: Record<Priority, number>;
};

export async function queueHealth(): Promise<QueueHealth> {
  const [info, rows] = await Promise.all([storageInfo(), getPackets()]);
  const byPriority: Record<Priority, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  rows.forEach((r) => {
    byPriority[r.priority] = (byPriority[r.priority] ?? 0) + 1;
  });
  return {
    count: rows.length,
    usageMb: Number((info.usage / 1e6).toFixed(1)),
    quotaMb: Number((info.quota / 1e6).toFixed(1)),
    ratio: info.ratio,
    persisted: info.persisted,
    byPriority,
  };
}
