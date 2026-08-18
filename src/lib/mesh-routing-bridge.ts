/**
 * Rota istemcisi — çekirdek işçisine köprü.
 * ------------------------------------------------------------------
 * Rota hesabı artık ayrı bir Dijkstra işçisinde değil, ikili çerçeveli
 * çekirdek işçisinde (kernel.worker.ts) yürür. İşçi yoksa (SSR, eski
 * tarayıcı) senkron motora düşülür; çağıran taraf farkı hissetmez.
 */

import { routeInWorker, routeRequest } from "@/kernel/kernel-worker-bridge";
import type { Graph, RouteResult } from "@/lib/mesh-routing";

/** Rotayı arka planda hesaplar; UI iş parçacığı boşta kalır. */
export function routeAsync(graph: Graph, from: string, to: string): Promise<RouteResult> {
  return routeInWorker(routeRequest(graph, from, to));
}
