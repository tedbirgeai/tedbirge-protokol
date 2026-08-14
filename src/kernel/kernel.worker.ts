/**
 * ÇEKİRDEK İŞÇİSİ (kernel.worker.ts)
 * ------------------------------------------------------------------
 * Yönlendirme, özet (mükerrer paket filtresi) ve yetenek bildirimi ana
 * iş parçacığından çıkarılır. Tüm trafik `ipc.ts` ikili çerçevesiyle,
 * `Transferable ArrayBuffer` üzerinde taşınır — JSON kopyası yoktur.
 *
 * Wasm çekirdeği bulunabiliyorsa ağırlık/atlama hesabı ona devredilir;
 * bulunamazsa TypeScript motoru aynı sonucu üretir (sessiz düşüş).
 */

/// <reference lib="webworker" />

import { decodeFrame, encodeFrame, OP } from "@/kernel/ipc";
import { decodeRouteRequest, encodeRouteResult } from "@/kernel/route-codec";
import { localSubgraph, shortestPath } from "@/lib/mesh-routing";

type KernelExports = {
  abi_version: () => number;
  digest32?: (ptr: number, len: number) => number;
  kernel_alloc?: (len: number) => number;
  kernel_free?: (ptr: number, len: number) => void;
  memory?: WebAssembly.Memory;
};

let wasm: KernelExports | null = null;
let wasmTried = false;

async function ensureWasm(): Promise<KernelExports | null> {
  if (wasmTried) return wasm;
  wasmTried = true;
  try {
    const res = await fetch("/kernel/tedbirge_kernel.wasm");
    if (!res.ok) return null;
    const { instance } = await WebAssembly.instantiate(await res.arrayBuffer(), {});
    const ex = instance.exports as unknown as KernelExports;
    if (typeof ex.abi_version === "function" && ex.abi_version() === 1) wasm = ex;
  } catch {
    wasm = null;
  }
  return wasm;
}

/** FNV-1a 32 bit — Rust `digest32` ile aynı sonuç (yedek yol). */
function digestJs(bytes: Uint8Array): number {
  let h = 2166136261;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function digest(bytes: Uint8Array): number {
  const mod = wasm;
  if (mod?.digest32 && mod.kernel_alloc && mod.kernel_free && mod.memory) {
    try {
      const ptr = mod.kernel_alloc(bytes.length);
      new Uint8Array(mod.memory.buffer, ptr, bytes.length).set(bytes);
      const out = mod.digest32(ptr, bytes.length) >>> 0;
      mod.kernel_free(ptr, bytes.length);
      return out;
    } catch {
      /* Wasm arızası: TS yoluna düş */
    }
  }
  return digestJs(bytes);
}

function reply(op: number, corrId: number, payload: ArrayBuffer) {
  const frame = encodeFrame(op, corrId, payload);
  (self as unknown as Worker).postMessage(frame, [frame]);
}

self.onmessage = (e: MessageEvent<ArrayBuffer>) => {
  const frame = decodeFrame(e.data);
  if (!frame) return;

  if (frame.op === OP.HELLO) {
    void ensureWasm().then((mod) => {
      const out = new ArrayBuffer(2);
      const view = new DataView(out);
      view.setUint8(0, mod ? 1 : 0);
      view.setUint8(1, mod ? mod.abi_version() : 0);
      reply(OP.HELLO_RESULT, frame.corrId, out);
    });
    return;
  }

  if (frame.op === OP.DIGEST) {
    const value = digest(new Uint8Array(frame.payload));
    const out = new ArrayBuffer(4);
    new DataView(out).setUint32(0, value, true);
    reply(OP.DIGEST_RESULT, frame.corrId, out);
    return;
  }

  if (frame.op === OP.ROUTE) {
    const req = decodeRouteRequest(frame.payload);
    // k-hop yerel mesh: yarıçap dışındaki düğümler DHT katmanına bırakılır.
    const scoped = localSubgraph(req.graph, req.from, req.radius);
    const graph = scoped.nodes.includes(req.to) ? scoped : req.graph;
    // Kenar kaliteleri ana iş parçacığında canlı ölçümle güncellendiği için
    // burada statik taşıyıcı maliyeti kullanılır (çift sayım olmasın).
    const route = shortestPath(graph, req.from, req.to, { metrics: false });
    reply(OP.ROUTE_RESULT, frame.corrId, encodeRouteResult(route));
    return;
  }
};

// İlk fırsatta Wasm'ı ısıt: ilk rota isteği gecikmesin.
void ensureWasm();
