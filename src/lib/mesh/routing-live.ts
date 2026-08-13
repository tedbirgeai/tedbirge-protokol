import { edgeCost, transportById, type Edge, type Graph, type RouteResult, type TransportId } from "@/lib/mesh-routing";
import { linkMetrics, weightFromMetrics } from "@/lib/mesh/link-metrics";
import { transitConfig } from "@/lib/transit-config";

export function edgeCostLive(edge: Edge): number {
  const t = transportById(edge.transport);
  const staticCost = edgeCost(edge);
  const live = weightFromMetrics(linkMetrics(edge.to), t.penalty);
  return (staticCost + live) / 2;
}

export function buildLiveGraph(me: string, peers: string[], to: string, transport: TransportId = "cloud-webrtc"): Graph {
  const nodes = Array.from(new Set([me, to, ...peers]));
  const edges: Edge[] = peers.map((p) => ({ from: me, to: p, transport, quality: linkMetrics(p).quality }));
  return { nodes, edges };
}

export function shortestPathBounded(
  graph: Graph, from: string, to: string,
  hopRadius: number = transitConfig().hopRadius,
  weigh: (e: Edge) => number = edgeCost,
): RouteResult {
  const radius = Math.max(1, hopRadius | 0);
  const dist = new Map<string, number>();
  const depth = new Map<string, number>();
  const prev = new Map<string, Edge>();
  const visited = new Set<string>();
  const nodes = new Set<string>([...graph.nodes, from, to]);
  nodes.forEach((n) => dist.set(n, Number.POSITIVE_INFINITY));
  dist.set(from, 0); depth.set(from, 0);

  const adjacency = new Map<string, Edge[]>();
  for (const e of graph.edges) {
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    if (!adjacency.has(e.to)) adjacency.set(e.to, []);
    adjacency.get(e.from)!.push(e);
    adjacency.get(e.to)!.push({ ...e, from: e.to, to: e.from });
  }

  for (;;) {
    let current: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const n of nodes) {
      if (visited.has(n)) continue;
      const d = dist.get(n) ?? Number.POSITIVE_INFINITY;
      if (d < best) { best = d; current = n; }
    }
    if (current === null || current === to) break;
    visited.add(current);
    const curDepth = depth.get(current) ?? 0;
    if (curDepth >= radius) continue;
    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      const next = best + weigh(edge);
      if (next < (dist.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(edge.to, next); depth.set(edge.to, curDepth + 1); prev.set(edge.to, edge);
      }
    }
  }

  const cost = dist.get(to) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(cost)) return { path: [], hops: [], cost: Number.POSITIVE_INFINITY, reachable: false };
  const hops: Edge[] = [];
  let cursor = to;
  while (cursor !== from) {
    const edge = prev.get(cursor);
    if (!edge) return { path: [], hops: [], cost: Number.POSITIVE_INFINITY, reachable: false };
    hops.unshift(edge); cursor = edge.from;
  }
  return { path: [from, ...hops.map((h) => h.to)], hops, cost, reachable: true };
}
