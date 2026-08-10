/**
 * CANLI SİNYALLEŞME SERVİSİ (WebRTC / Mesh)
 * ------------------------------------------------------------------
 * Web-OS arayüzünün tek canlı veri kaynağı. Sahte (mock) katılımcı ve
 * mesaj dizileri yerine gerçek düğüm durumunu, eş listesini ve şifreli
 * paket akışını sağlar. SDP/ICE el sıkışması BrowserNode içinde yürür;
 * bu servis kabuk bileşenlerine sade bir yüzey verir.
 */

import { bootMeshBus, onMesh } from "@/lib/mesh-bus";
import { sendMesh, startNode } from "@/lib/node-runtime";
import { shortestPath } from "@/lib/mesh-routing";
import type { Graph } from "@/lib/mesh-routing";
import type { PeerInfo } from "@/lib/browser-node";

export type LivePeer = {
  id: string;
  /** Arayüzde gösterilen kısa düğüm etiketi (ör. NODE_8A1). */
  label: string;
  direct: boolean;
  verified: boolean;
};

export type LiveMessage = {
  id: string;
  from: string;
  at: string;
  text: string;
  self?: boolean;
};

/** Düğüm kimliğinden okunabilir kısa etiket üretir: NODE_8A1. */
export function nodeLabel(nodeId: string): string {
  const clean = (nodeId || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `NODE_${clean.slice(-3) || "000"}`;
}

/** Eş listesini arayüz modeline çevirir. */
export function toLivePeers(peers: PeerInfo[]): LivePeer[] {
  return peers.map((p) => ({
    id: p.nodeId,
    label: nodeLabel(p.nodeId),
    direct: p.direct,
    verified: Boolean(p.verified),
  }));
}

function stamp(): string {
  return new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

/** Düğümü ateşler ve veri yolunu açar (fikirdaş / idempotent). */
export async function ensureLiveNode(): Promise<void> {
  bootMeshBus();
  await startNode();
}

/** Şifreli metin paketlerini dinler. */
export function onLiveMessage(cb: (msg: LiveMessage) => void): () => void {
  bootMeshBus();
  return onMesh("text", (from, body) => {
    const text =
      typeof body === "string"
        ? body
        : typeof (body as { text?: unknown })?.text === "string"
          ? (body as { text: string }).text
          : "";
    if (!text) return;
    cb({ id: `${from}-${Date.now()}-${Math.random()}`, from: nodeLabel(from), at: stamp(), text });
  });
}

/** Bağlı tüm eşlere şifreli metin yayınlar. */
export async function broadcastText(text: string): Promise<boolean> {
  const clean = text.trim();
  if (!clean) return false;
  return sendMesh("text", "*", { text: clean });
}

/**
 * Canlı rota ölçümü: eş grafiği gerçek gecikmeye göre kurulur ve
 * Dijkstra motoru arka plan işçisinde çalıştırılır.
 */
export async function measureRoute(
  selfId: string,
  peers: PeerInfo[],
  rttMs: number | null,
): Promise<{ hops: number; cost: number } | null> {
  const target = peers.find((p) => p.direct) ?? peers[0];
  if (!selfId || !target) return null;
  const quality = rttMs == null ? 0.8 : Math.min(1, Math.max(0.1, 120 / Math.max(20, rttMs)));
  const graph: Graph = {
    nodes: [selfId, ...peers.map((p) => p.nodeId)],
    edges: peers.map((p) => ({
      from: selfId,
      to: p.nodeId,
      transport: p.direct ? ("cloud-webrtc" as const) : ("push-relay" as const),
      quality,
    })),
  };
  const route = await routeAsync(graph, selfId, target.nodeId);
  if (!route.reachable) return null;
  return { hops: Math.max(0, route.path.length - 1), cost: Math.round(route.cost) };
}
