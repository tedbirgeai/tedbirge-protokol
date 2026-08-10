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
  const route = shortestPath(graph, selfId, target.nodeId);
  if (!route.reachable) return null;
  return { hops: Math.max(0, route.path.length - 1), cost: Math.round(route.cost) };
}

/* ==================================================================
 * YEREL / CANLI EŞ KEŞFİ (BroadcastChannel + Realtime yedeği)
 * ------------------------------------------------------------------
 * Aynı adresi açan iki cihaz birbirini anında görür. Aynı tarayıcıdaki
 * sekmeler BroadcastChannel ile, farklı cihazlar bulut sinyal kanalı
 * (Supabase Realtime presence) ile eşleşir. Hiçbir aşamada kamera veya
 * mikrofon izni istenmez — keşif tamamen veri kanalıdır.
 * ================================================================== */

import { supabase } from "@/integrations/supabase/client";

const PEER_KEY = "tedbirge.local-peer-id";
const CHANNEL = "tedbirge-signal";
const TTL_MS = 12_000;

/** Cihaza kalıcı, benzersiz düğüm kimliği (localStorage UUID). */
export function getLocalPeerId(): string {
  if (typeof window === "undefined") return "NODE_SSR";
  try {
    const existing = window.localStorage.getItem(PEER_KEY);
    if (existing) return existing;
    const uuid = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    const id = `NODE_${uuid.slice(0, 6)}`;
    window.localStorage.setItem(PEER_KEY, id);
    return id;
  } catch {
    return `NODE_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
}

type Presence = { id: string; at: number; via: "local" | "cloud" };

/**
 * Yerel + bulut sinyal kanalını açar; çevrimiçi eş kimliklerini yayınlar.
 * Dönen fonksiyon tüm kanalları kapatır.
 */
export function subscribeLivePeers(onPeers: (ids: string[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const self = getLocalPeerId();
  const seen = new Map<string, Presence>();

  const flush = () => {
    const now = Date.now();
    for (const [id, p] of seen) if (now - p.at > TTL_MS) seen.delete(id);
    onPeers([...seen.keys()]);
  };

  const note = (id: string, via: Presence["via"]) => {
    if (!id || id === self) return;
    seen.set(id, { id, at: Date.now(), via });
    flush();
  };

  // 1) Aynı tarayıcıdaki sekmeler / pencereler
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e: MessageEvent<{ type: string; id: string }>) => {
      if (e.data?.type === "hello" || e.data?.type === "ack") note(e.data.id, "local");
      if (e.data?.type === "hello") bc?.postMessage({ type: "ack", id: self });
    };
    bc.postMessage({ type: "hello", id: self });
  } catch {
    bc = null;
  }

  // 2) Farklı cihazlar — bulut sinyal kanalı (presence)
  const rt = supabase.channel(`presence:${CHANNEL}`, { config: { presence: { key: self } } });
  rt.on("presence", { event: "sync" }, () => {
    const state = rt.presenceState() as Record<string, unknown[]>;
    Object.keys(state).forEach((id) => note(id, "cloud"));
  });
  rt.on("presence", { event: "leave" }, ({ key }: { key: string }) => {
    seen.delete(key);
    flush();
  });
  void rt.subscribe((status) => {
    if (status === "SUBSCRIBED") void rt.track({ id: self, at: Date.now() });
  });

  const beat = setInterval(() => {
    bc?.postMessage({ type: "hello", id: self });
    flush();
  }, 4_000);

  return () => {
    clearInterval(beat);
    bc?.close();
    void supabase.removeChannel(rt);
  };
}
