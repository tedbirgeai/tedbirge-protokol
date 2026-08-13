import { decodeFrame, encodeFrame, OP } from "@/kernel/ipc";
import { decodeRouteResult, encodeRouteRequest, type RouteRequest } from "@/kernel/route-codec";
import { shortestPathBounded } from "@/lib/mesh/routing-live";
import type { RouteResult } from "@/lib/mesh-routing";

let worker: Worker | null = null;
let disabled = false;
let seq = 0;
const pending = new Map<number, (r: RouteResult) => void>();

function ensureWorker(): Worker | null {
  if (disabled) return null;
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./kernel.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      const frame = decodeFrame(e.data);
      if (!frame || frame.op !== OP.ROUTE_RESULT) return;
      const done = pending.get(frame.corrId);
      if (done) { pending.delete(frame.corrId); done(decodeRouteResult(frame.payload)); }
    };
    worker.onerror = () => { disabled = true; worker = null; };
  } catch { disabled = true; worker = null; }
  return worker;
}

export function routeViaWorker(req: RouteRequest): Promise<RouteResult> {
  const fallback = () => shortestPathBounded(req.graph, req.from, req.to, req.radius);
  const w = ensureWorker();
  if (!w) return Promise.resolve(fallback());
  const corrId = (seq = (seq + 1) >>> 0);
  const frame = encodeFrame(OP.ROUTE, corrId, encodeRouteRequest(req));
  return new Promise<RouteResult>((resolve) => {
    const timer = setTimeout(() => { if (pending.delete(corrId)) resolve(fallback()); }, 1200);
    pending.set(corrId, (r) => { clearTimeout(timer); resolve(r); });
    try { w.postMessage(frame, [frame]); }
    catch { clearTimeout(timer); pending.delete(corrId); resolve(fallback()); }
  });
}

export function disposeKernelWorker() {
  try { worker?.terminate(); } catch { /* zaten kapalı */ }
  worker = null; pending.clear();
}
