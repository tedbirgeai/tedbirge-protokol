/**
 * Rota istemcisi — arka plan işçisine köprü.
 * ------------------------------------------------------------------
 * Worker desteklenmiyorsa (SSR, eski tarayıcı) senkron motora düşer;
 * çağıran taraf farkı hissetmez.
 */

import { shortestPath, type Graph, type RouteResult } from "@/lib/mesh-routing";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: RouteResult) => void>();

function ensureWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./mesh-routing.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; route: RouteResult }>) => {
      const done = pending.get(e.data.id);
      if (done) {
        pending.delete(e.data.id);
        done(e.data.route);
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

/** Rotayı arka planda hesaplar; UI iş parçacığı boşta kalır. */
export function routeAsync(graph: Graph, from: string, to: string): Promise<RouteResult> {
  const w = ensureWorker();
  if (!w) return Promise.resolve(shortestPath(graph, from, to));
  const id = ++seq;
  return new Promise<RouteResult>((resolve) => {
    const timeout = setTimeout(() => {
      if (pending.delete(id)) resolve(shortestPath(graph, from, to));
    }, 1200);
    pending.set(id, (route) => {
      clearTimeout(timeout);
      resolve(route);
    });
    w.postMessage({ id, graph, from, to });
  });
}
