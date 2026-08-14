/**
 * DAĞITIK DÜĞÜM DİZİNİ (Kademlia k-bucket + AODV rota önbelleği)
 * ------------------------------------------------------------------
 * Merkezî sunucu listesi yoktur. Her düğüm yalnızca kendi XOR uzaklık
 * kovalarını (k-bucket) tutar; hedefe giden yol bilinmiyorsa AODV
 * mantığıyla en yakın komşulara rota isteği düşülür ve bulunan yol
 * kısa ömürlü önbelleğe alınır.
 *
 * Kimlikler 32 bitlik FNV-1a karmasına indirgenir — Rust çekirdeğindeki
 * `fnv1a` ile birebir aynı fonksiyon, böylece Wasm ve TS aynı uzaklığı
 * hesaplar.
 */

import { transitConfig } from "@/lib/transit-config";

/** Kova başına tutulacak en fazla düğüm (Kademlia k). */
export const BUCKET_K = 8;
/** AODV rota önbelleği ömrü. */
export const ROUTE_TTL_MS = 30_000;

export type DhtNode = {
  nodeId: string;
  /** Bu düğüme hangi komşu üzerinden ulaşıldı (doğrudan ise kendisi). */
  via: string;
  /** Kaç sıçrama uzakta olduğu bilgisi (1 = doğrudan komşu). */
  hops: number;
  lastSeen: number;
};

export type CachedRoute = { path: string[]; cost: number; at: number };

const buckets = new Map<number, DhtNode[]>();
const routes = new Map<string, CachedRoute>();

/** FNV-1a 32 bit — Rust çekirdeğiyle aynı karma. */
export function dhtId(nodeId: string): number {
  let h = 2166136261;
  const bytes = new TextEncoder().encode(nodeId);
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** XOR uzaklık (küçük = yakın). */
export function distance(a: string, b: string): number {
  return (dhtId(a) ^ dhtId(b)) >>> 0;
}

function bucketIndex(self: string, other: string): number {
  const d = distance(self, other);
  return d === 0 ? 0 : 31 - Math.clz32(d);
}

/** Bir düğümü dizine işler (heartbeat/hello/röle gözlemi sonrası). */
export function observeNode(self: string, node: { nodeId: string; via?: string; hops?: number }) {
  if (!self || !node.nodeId || node.nodeId === self) return;
  const idx = bucketIndex(self, node.nodeId);
  const list = buckets.get(idx) ?? [];
  const next: DhtNode = {
    nodeId: node.nodeId,
    via: node.via ?? node.nodeId,
    hops: Math.max(1, node.hops ?? 1),
    lastSeen: Date.now(),
  };
  const rest = list.filter((n) => n.nodeId !== node.nodeId);
  rest.unshift(next);
  buckets.set(idx, rest.slice(0, BUCKET_K));
}

/** Dizinden düşen (hayalet) düğümü siler. */
export function forgetNode(self: string, nodeId: string) {
  const idx = bucketIndex(self, nodeId);
  const list = buckets.get(idx);
  if (list) buckets.set(idx, list.filter((n) => n.nodeId !== nodeId));
  routes.delete(nodeId);
  for (const [target, route] of routes) {
    if (route.path.includes(nodeId)) routes.delete(target);
  }
}

/** Zaman aşımına uğrayan kayıtları budar (GC ile birlikte çağrılır). */
export function sweepDht(timeoutMs = transitConfig().peerTimeoutMs): number {
  const now = Date.now();
  let removed = 0;
  for (const [idx, list] of buckets) {
    const alive = list.filter((n) => now - n.lastSeen <= timeoutMs);
    removed += list.length - alive.length;
    buckets.set(idx, alive);
  }
  for (const [target, route] of routes) {
    if (now - route.at > ROUTE_TTL_MS) routes.delete(target);
  }
  return removed;
}

/** Bilinen tüm düğümler (tazelikten eskiye). */
export function knownNodes(): DhtNode[] {
  return [...buckets.values()].flat().sort((a, b) => b.lastSeen - a.lastSeen);
}

/** Hedefe XOR olarak en yakın k düğüm — AODV rota isteği bu düğümlere gider. */
export function closestNodes(target: string, k = BUCKET_K): DhtNode[] {
  return knownNodes()
    .slice()
    .sort((a, b) => distance(a.nodeId, target) - distance(b.nodeId, target))
    .slice(0, k);
}

/** Doğrudan komşular (1 sıçrama). */
export function directNeighbors(): DhtNode[] {
  return knownNodes().filter((n) => n.hops === 1);
}

/* --------------------------- AODV önbelleği --------------------------- */

export function cacheRoute(target: string, path: string[], cost: number) {
  if (!target || path.length < 2) return;
  routes.set(target, { path, cost, at: Date.now() });
}

export function cachedRoute(target: string): CachedRoute | null {
  const r = routes.get(target);
  if (!r) return null;
  if (Date.now() - r.at > ROUTE_TTL_MS) {
    routes.delete(target);
    return null;
  }
  return r;
}

/** Hedefe giden bir sonraki sıçrama (yönlendirilmiş iletim için). */
export function nextHop(self: string, target: string): string | null {
  const route = cachedRoute(target);
  if (route) {
    const i = route.path.indexOf(self);
    if (i >= 0 && i + 1 < route.path.length) return route.path[i + 1] ?? null;
    return route.path[1] ?? null;
  }
  const direct = knownNodes().find((n) => n.nodeId === target && n.hops === 1);
  if (direct) return target;
  const near = closestNodes(target, 1)[0];
  return near ? near.via : null;
}

/** Test/oturum sıfırlaması. */
export function resetDht() {
  buckets.clear();
  routes.clear();
}
