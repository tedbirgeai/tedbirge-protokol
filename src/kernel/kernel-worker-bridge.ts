/**
 * ÇEKİRDEK İŞÇİSİ KÖPRÜSÜ (ana iş parçacığı istemcisi)
 * ------------------------------------------------------------------
 * `kernel.worker.ts` ile ikili çerçeve üzerinden konuşur. Worker yoksa
 * (SSR, eski tarayıcı, worker kurulum hatası) aynı hesap senkron motorla
 * yapılır; çağıran taraf farkı hissetmez.
 */

import { decodeFrame, encodeFrame, OP } from "@/kernel/ipc";
import { decodeRouteResult, encodeRouteRequest, type RouteRequest } from "@/kernel/route-codec";
import { localSubgraph, shortestPath, type RouteResult } from "@/lib/mesh-routing";
import { transitConfig } from "@/lib/transit-config";

const TIMEOUT_MS = 1_500;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (payload: ArrayBuffer) => void>();

function ensureWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./kernel.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      const frame = decodeFrame(e.data);
      if (!frame) return;
      const done = pending.get(frame.corrId);
      if (done) {
        pending.delete(frame.corrId);
        done(frame.payload);
      }
    };
    worker.onerror = () => {
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

function call(op: number, payload: ArrayBuffer): Promise<ArrayBuffer | null> {
  const w = ensureWorker();
  if (!w) return Promise.resolve(null);
  const corrId = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pending.delete(corrId)) resolve(null);
    }, TIMEOUT_MS);
    pending.set(corrId, (buf) => {
      clearTimeout(timer);
      resolve(buf);
    });
    const frame = encodeFrame(op, corrId, payload);
    try {
      w.postMessage(frame, [frame]);
    } catch {
      clearTimeout(timer);
      pending.delete(corrId);
      resolve(null);
    }
  });
}

/** Rota hesabını işçiye devreder; başarısızsa senkron motora düşer. */
export async function routeInWorker(req: RouteRequest): Promise<RouteResult> {
  const fallback = () => {
    const scoped = localSubgraph(req.graph, req.from, req.radius);
    const graph = scoped.nodes.includes(req.to) ? scoped : req.graph;
    return shortestPath(graph, req.from, req.to);
  };
  const out = await call(OP.ROUTE, encodeRouteRequest(req));
  if (!out) return fallback();
  try {
    return decodeRouteResult(out);
  } catch {
    return fallback();
  }
}

/** Paket özeti (mükerrer filtresi) — 32 bit. */
export async function digestInWorker(bytes: Uint8Array): Promise<number> {
  const copy = new Uint8Array(bytes);
  const out = await call(OP.DIGEST, copy.buffer);
  if (out && out.byteLength >= 4) return new DataView(out).getUint32(0, true);
  let h = 2166136261;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type KernelWorkerInfo = { alive: boolean; wasm: boolean; abi: number };

/** İşçi ve Wasm çekirdeği durumu (Ayarlar panelinde gösterilir). */
export async function kernelWorkerInfo(): Promise<KernelWorkerInfo> {
  const out = await call(OP.HELLO, new ArrayBuffer(0));
  if (!out || out.byteLength < 2) return { alive: false, wasm: false, abi: 0 };
  const view = new DataView(out);
  return { alive: true, wasm: view.getUint8(0) === 1, abi: view.getUint8(1) };
}

/** Varsayılan yarıçapla rota isteği kurar. */
export function routeRequest(graph: RouteRequest["graph"], from: string, to: string): RouteRequest {
  return { graph, from, to, radius: transitConfig().hopRadius };
}

/** Test/kapanış: işçiyi serbest bırakır. */
export function disposeKernelWorker() {
  worker?.terminate();
  worker = null;
  pending.clear();
}
