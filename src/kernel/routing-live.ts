/**
 * CANLI YÖNLENDİRME (routing-live.ts)
 * ------------------------------------------------------------------
 * DHT dizinindeki komşular + canlı hat ölçümleri birleştirilerek gerçek
 * ağ grafiği kurulur; rota hesabı çekirdek işçisine devredilir.
 * Bulunan yol AODV önbelleğine yazılır, bir sonraki sıçrama yönlendirilmiş
 * iletim için kullanılır.
 */

import { routeInWorker, routeRequest } from "@/kernel/kernel-worker-bridge";
import { cacheRoute, cachedRoute, directNeighbors, knownNodes, nextHop } from "@/lib/mesh/dht";
import { linkMetrics } from "@/lib/mesh/link-metrics";
import type { Edge, Graph, RouteResult } from "@/lib/mesh-routing";

/** Ölçüm kaydından 0–1 kenar kalitesi türetir (worker statik maliyet kullanır). */
function qualityOf(peerId: string): number {
  const m = linkMetrics(peerId);
  const rttScore = Math.min(1, 200 / Math.max(20, m.rttMs));
  return Math.min(1, Math.max(0.05, m.quality * 0.6 + rttScore * 0.4));
}

/** Canlı topoloji: doğrudan komşular + DHT üzerinden bilinen uzak düğümler. */
export function liveGraph(self: string, target?: string): Graph {
  const edges: Edge[] = [];
  const nodes = new Set<string>([self]);
  if (target) nodes.add(target);

  for (const n of directNeighbors()) {
    nodes.add(n.nodeId);
    edges.push({ from: self, to: n.nodeId, transport: "cloud-webrtc", quality: qualityOf(n.nodeId) });
  }
  for (const n of knownNodes()) {
    if (n.hops <= 1 || n.via === n.nodeId) continue;
    nodes.add(n.nodeId);
    nodes.add(n.via);
    edges.push({
      from: n.via,
      to: n.nodeId,
      transport: "store-forward",
      quality: qualityOf(n.nodeId),
    });
  }
  return { nodes: [...nodes], edges };
}

/** Hedefe canlı rota — önbellek → işçi → AODV kaydı. */
export async function routeLive(self: string, to: string): Promise<RouteResult> {
  const cached = cachedRoute(to);
  if (cached) {
    return { path: cached.path, hops: [], cost: cached.cost, reachable: true };
  }
  const route = await routeInWorker(routeRequest(liveGraph(self, to), self, to));
  if (route.reachable && route.path.length > 1) cacheRoute(to, route.path, route.cost);
  return route;
}

/** Yönlendirilmiş iletimde kullanılacak bir sonraki sıçrama. */
export function liveNextHop(self: string, to: string): string | null {
  return nextHop(self, to);
}
