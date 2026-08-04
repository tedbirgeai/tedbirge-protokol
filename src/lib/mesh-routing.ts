/**
 * Çok atlamalı (multi-hop) yönlendirme — Dijkstra en kısa yol motoru.
 * ------------------------------------------------------------------
 * 10 taşıyıcı katmanının her biri farklı gecikme/bant/enerji maliyetine
 * sahiptir. Ağ grafiği düğümler (cihazlar) ve kenarlardan (taşıyıcı
 * bağlantıları) oluşur; motor kaynaktan hedefe toplam maliyeti en
 * düşük yolu hesaplar. Paket gövdesi uçtan uca şifreli kaldığı için
 * ara düğümler yalnızca yönlendirme başlığını görür.
 */

export type TransportId =
  | "openwrt-gateway"
  | "cloud-webrtc"
  | "lan-ws"
  | "broadcast-channel"
  | "ble"
  | "lora-serial"
  | "mdns-udp"
  | "wifi-direct"
  | "store-forward"
  | "push-relay";

export type TransportDef = {
  id: TransportId;
  label: string;
  /** Kullanıcıya gösterilen sade açıklama. */
  hint: string;
  /** Tipik gecikme (ms) — Dijkstra maliyet çekirdeği. */
  latencyMs: number;
  /** Yaklaşık verim (kbps). */
  kbps: number;
  /** Enerji/duty-cycle cezası (0–1). */
  penalty: number;
};

/** 10 taşıyıcı katmanı — sıralama, tercih önceliğini yansıtır. */
export const TRANSPORTS: TransportDef[] = [
  { id: "openwrt-gateway", label: "Yerel geçit (OpenWrt)", hint: "Şebeke beslemeli, 7/24 açık ev/bina geçidi", latencyMs: 10, kbps: 50000, penalty: 0 },
  { id: "cloud-webrtc", label: "Bulut WebRTC", hint: "İnternet varken doğrudan eş bağlantısı", latencyMs: 60, kbps: 20000, penalty: 0 },
  { id: "lan-ws", label: "Yerel LAN", hint: "Aynı Wi-Fi ağındaki saha geçidi", latencyMs: 15, kbps: 40000, penalty: 0 },
  { id: "broadcast-channel", label: "Cihaz içi kanal", hint: "Aynı cihazdaki sekmeler ve uygulama", latencyMs: 2, kbps: 100000, penalty: 0 },
  { id: "wifi-direct", label: "Wi-Fi Direct / Hotspot", hint: "Cihazdan cihaza erişim noktası", latencyMs: 25, kbps: 25000, penalty: 0.1 },
  { id: "mdns-udp", label: "mDNS / UDP yayın", hint: "Yerel ağda komşu keşfi", latencyMs: 30, kbps: 8000, penalty: 0.1 },
  { id: "ble", label: "Bluetooth (BLE)", hint: "Kısa mesafe, düşük enerji", latencyMs: 120, kbps: 100, penalty: 0.3 },
  { id: "lora-serial", label: "LoRa / Seri modem", hint: "Kilometrelerce menzil, düşük hız", latencyMs: 900, kbps: 5, penalty: 0.6 },
  { id: "store-forward", label: "Sakla-ilet deposu", hint: "Bağlantı yokken cihazda bekletme", latencyMs: 60000, kbps: 1, penalty: 0.8 },
  { id: "push-relay", label: "Geçit / bildirim rölesi", hint: "Uygulama kapalıyken teslim", latencyMs: 3000, kbps: 50, penalty: 0.5 },
];

export function transportById(id: TransportId): TransportDef {
  return TRANSPORTS.find((t) => t.id === id) ?? TRANSPORTS[0]!;
}

export type Edge = { from: string; to: string; transport: TransportId; /** 0–1, 1 = mükemmel */ quality: number };
export type Graph = { nodes: string[]; edges: Edge[] };

/** Kenar maliyeti: gecikme + verim + enerji cezası + sinyal kalitesi. */
export function edgeCost(edge: Edge): number {
  const t = transportById(edge.transport);
  const quality = Math.min(1, Math.max(0.05, edge.quality));
  return (t.latencyMs + 8000 / t.kbps) * (1 + t.penalty) * (1 / quality);
}

export type RouteResult = {
  path: string[];
  hops: Edge[];
  cost: number;
  reachable: boolean;
};

/** Klasik Dijkstra — küçük saha grafikleri için dizi tabanlı öncelik kuyruğu yeterlidir. */
export function shortestPath(graph: Graph, from: string, to: string): RouteResult {
  const dist = new Map<string, number>();
  const prev = new Map<string, Edge>();
  const visited = new Set<string>();
  const nodes = new Set<string>([...graph.nodes, from, to]);
  nodes.forEach((n) => dist.set(n, Number.POSITIVE_INFINITY));
  dist.set(from, 0);

  const adjacency = new Map<string, Edge[]>();
  for (const e of graph.edges) {
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    if (!adjacency.has(e.to)) adjacency.set(e.to, []);
    adjacency.get(e.from)!.push(e);
    // Taşıyıcılar çift yönlüdür.
    adjacency.get(e.to)!.push({ ...e, from: e.to, to: e.from });
  }

  for (;;) {
    let current: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const n of nodes) {
      if (visited.has(n)) continue;
      const d = dist.get(n) ?? Number.POSITIVE_INFINITY;
      if (d < best) {
        best = d;
        current = n;
      }
    }
    if (current === null || current === to) break;
    visited.add(current);
    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      const next = best + edgeCost(edge);
      if (next < (dist.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(edge.to, next);
        prev.set(edge.to, edge);
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
    hops.unshift(edge);
    cursor = edge.from;
  }
  return { path: [from, ...hops.map((h) => h.to)], hops, cost, reachable: true };
}

/** Sade Türkçe rota özeti (arayüzde gösterilir). */
export function describeRoute(route: RouteResult): string {
  if (!route.reachable) return "Bu cihaza şu an ulaşılabilir bir yol yok — mesaj cihazda bekletilecek.";
  if (!route.hops.length) return "Doğrudan bağlantı.";
  const labels = route.hops.map((h) => transportById(h.transport).label);
  return `${route.hops.length} atlama · ${labels.join(" → ")}`;
}
