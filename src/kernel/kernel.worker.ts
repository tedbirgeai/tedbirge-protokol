/// <reference lib="webworker" />
import { decodeFrame, encodeFrame, OP } from "@/kernel/ipc";
import { decodeRouteRequest, encodeRouteResult } from "@/kernel/route-codec";
import { shortestPathBounded } from "@/lib/mesh/routing-live";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function digest32(bytes: Uint8Array): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < bytes.length; i += 1) { h ^= bytes[i]!; h = Math.imul(h, 16777619); }
  return h >>> 0;
}

ctx.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const buf = e.data;
  if (!(buf instanceof ArrayBuffer)) return;
  let frame: ReturnType<typeof decodeFrame>;
  try { frame = decodeFrame(buf); } catch { return; }
  if (!frame) return;
  try {
    switch (frame.op) {
      case OP.ROUTE: {
        const req = decodeRouteRequest(frame.payload);
        const route = shortestPathBounded(req.graph, req.from, req.to, req.radius);
        const out = encodeFrame(OP.ROUTE_RESULT, frame.corrId, encodeRouteResult(route));
        ctx.postMessage(out, [out]);
        break;
      }
      case OP.DIGEST: {
        const d = digest32(new Uint8Array(frame.payload));
        const p = new ArrayBuffer(4);
        new DataView(p).setUint32(0, d, true);
        const out = encodeFrame(OP.DIGEST_RESULT, frame.corrId, p);
        ctx.postMessage(out, [out]);
        break;
      }
      case OP.HELLO: {
        const p = new ArrayBuffer(1);
        new DataView(p).setUint8(0, 1);
        const out = encodeFrame(OP.HELLO_RESULT, frame.corrId, p);
        ctx.postMessage(out, [out]);
        break;
      }
      default: break;
    }
  } catch { /* bozuk yük worker'ı çökertmez */ }
};
