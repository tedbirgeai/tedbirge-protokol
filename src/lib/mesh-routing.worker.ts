/**
 * Dijkstra yönlendirme işçisi (Web Worker).
 * ------------------------------------------------------------------
 * Rota hesabı ana iş parçacığından çıkarılır; arayüz katman geçişleri
 * (Bulut → Yerel Ağ → Mesh) sırasında asla donmaz.
 */

import { shortestPath, type Graph, type RouteResult } from "@/lib/mesh-routing";

type Req = { id: number; graph: Graph; from: string; to: string };
type Res = { id: number; route: RouteResult };

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, graph, from, to } = e.data;
  const route = shortestPath(graph, from, to);
  (self as unknown as Worker).postMessage({ id, route } satisfies Res);
};
