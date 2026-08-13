/**
 * Rota isteği/yanıtı için ikili kodlama.
 * ------------------------------------------------------------------
 * Grafik düğüm adları bir kez yazılır, kenarlar indeks referansı
 * kullanır. Kalite 0–255 (Q8) ölçeğinde tek bayta sıkışır.
 */

import { ByteReader, ByteWriter } from "@/kernel/ipc";
import { TRANSPORTS, type Edge, type Graph, type RouteResult } from "@/lib/mesh-routing";

export type RouteRequest = { graph: Graph; from: string; to: string; radius: number };

export function encodeRouteRequest(req: RouteRequest): ArrayBuffer {
  const nodes = [...new Set([...req.graph.nodes, req.from, req.to])];
  const index = new Map(nodes.map((n, i) => [n, i] as const));
  const w = new ByteWriter();
  w.u16(nodes.length);
  nodes.forEach((n) => w.str(n));
  const edges = req.graph.edges.filter((e) => index.has(e.from) && index.has(e.to));
  w.u16(edges.length);
  for (const e of edges) {
    w.u16(index.get(e.from)!);
    w.u16(index.get(e.to)!);
    w.u8(Math.max(0, TRANSPORTS.findIndex((t) => t.id === e.transport)));
    w.u8(Math.round(Math.min(1, Math.max(0, e.quality)) * 255));
  }
  w.u16(index.get(req.from)!);
  w.u16(index.get(req.to)!);
  w.u8(Math.min(255, Math.max(1, req.radius)));
  return w.buffer();
}

export function decodeRouteRequest(buf: ArrayBuffer): RouteRequest {
  const r = new ByteReader(buf);
  const nodeCount = r.u16();
  const nodes: string[] = [];
  for (let i = 0; i < nodeCount; i += 1) nodes.push(r.str());
  const edgeCount = r.u16();
  const edges: Edge[] = [];
  for (let i = 0; i < edgeCount; i += 1) {
    const from = nodes[r.u16()]!;
    const to = nodes[r.u16()]!;
    const transport = (TRANSPORTS[r.u8()] ?? TRANSPORTS[0]!).id;
    const quality = r.u8() / 255;
    edges.push({ from, to, transport, quality });
  }
  const from = nodes[r.u16()]!;
  const to = nodes[r.u16()]!;
  const radius = r.u8();
  return { graph: { nodes, edges }, from, to, radius };
}

export function encodeRouteResult(route: RouteResult): ArrayBuffer {
  const w = new ByteWriter();
  w.u8(route.reachable ? 1 : 0);
  w.u32(Number.isFinite(route.cost) ? Math.round(route.cost * 1000) : 0xffffffff);
  w.u16(route.path.length);
  route.path.forEach((p) => w.str(p));
  w.u16(route.hops.length);
  for (const h of route.hops) {
    w.str(h.from);
    w.str(h.to);
    w.u8(Math.max(0, TRANSPORTS.findIndex((t) => t.id === h.transport)));
    w.u8(Math.round(Math.min(1, Math.max(0, h.quality)) * 255));
  }
  return w.buffer();
}

export function decodeRouteResult(buf: ArrayBuffer): RouteResult {
  const r = new ByteReader(buf);
  const reachable = r.u8() === 1;
  const rawCost = r.u32();
  const cost = rawCost === 0xffffffff ? Number.POSITIVE_INFINITY : rawCost / 1000;
  const pathLen = r.u16();
  const path: string[] = [];
  for (let i = 0; i < pathLen; i += 1) path.push(r.str());
  const hopLen = r.u16();
  const hops: Edge[] = [];
  for (let i = 0; i < hopLen; i += 1) {
    const from = r.str();
    const to = r.str();
    const transport = (TRANSPORTS[r.u8()] ?? TRANSPORTS[0]!).id;
    const quality = r.u8() / 255;
    hops.push({ from, to, transport, quality });
  }
  return { reachable, cost, path, hops };
}
