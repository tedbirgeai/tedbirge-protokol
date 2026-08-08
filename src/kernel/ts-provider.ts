/**
 * KERNEL — TYPESCRIPT SAĞLAYICISI
 * ------------------------------------------------------------------
 * Bugünkü tarayıcı düğümü, `Kernel` sözleşmesinin tek sağlayıcısıdır.
 * Rust/Wasm çekirdeği geldiğinde yalnız bu dosyanın karşılığı yazılır;
 * kabuk ve uygulamalar değişmez.
 */

import { registerKernel, type Kernel } from "@/kernel/contract";
import { onMesh } from "@/lib/mesh-bus";
import { knownPeerIds, sendMesh } from "@/lib/node-runtime";
import { getBrowserNodeId, getPersonId } from "@/lib/browser-node";
import { shortestPath, type Graph } from "@/lib/mesh-routing";

function localGraph(to: string): Graph {
  const me = getBrowserNodeId();
  const peers = knownPeerIds();
  return {
    nodes: Array.from(new Set([me, to, ...peers])),
    edges: peers.map((p) => ({
      from: me,
      to: p,
      transport: "cloud-webrtc" as const,
      quality: 0.9,
    })),
  };
}

export const tsKernel: Kernel = {
  send: (kind, to, payload, priority) => sendMesh(kind, to, payload, priority),
  subscribe: (kind, fn) => onMesh(kind, fn),
  resolve: () => knownPeerIds(),
  route: (to) => shortestPath(localGraph(to), getBrowserNodeId(), to).path,
  identity: () => ({
    nodeId: getBrowserNodeId(),
    personId: getPersonId(),
    fingerprint: "",
  }),
  status: () => ({
    running: knownPeerIds().length >= 0,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    nodeId: getBrowserNodeId(),
    queued: 0,
    peers: knownPeerIds().length,
  }),
};

registerKernel(tsKernel);
