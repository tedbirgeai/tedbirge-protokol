/**
 * TAŞIMA KATMANI YAPILANDIRMASI (P2P Overlay Transit)
 * ------------------------------------------------------------------
 * Taşıyıcı hat sayısı koda gömülmez. Varsayılan pakette 5 ücretsiz
 * taşıyıcı hat vardır; paket yükseltmesinde bu sayı dinamik olarak
 * artar. Yapılandırma cihazda saklanır ve çalışma anında güncellenir.
 */

export type TransitConfig = {
  /** Eşzamanlı kullanılacak taşıyıcı hat (lane) sayısı. */
  lanes: number;
  /** Parça boyutu (bayt) — 16 KB veya 64 KB. */
  chunkBytes: 16384 | 65536;
  /** Yerel mesh yarıçapı (Dijkstra alt grafiği). */
  hopRadius: number;
  /** Hayalet düğüm temizliği eşiği (ms). */
  peerTimeoutMs: number;
  /** Aktif eşlere atılan hafif ping aralığı (ms). */
  heartbeatMs: number;
};

export const FREE_LANES = 5;

export const DEFAULT_TRANSIT: TransitConfig = {
  lanes: FREE_LANES,
  chunkBytes: 16384,
  hopRadius: 2,
  peerTimeoutMs: 30_000,
  heartbeatMs: 10_000,
};

const KEY = "tedbirge.transit.config";

let cache: TransitConfig | null = null;
const listeners = new Set<(c: TransitConfig) => void>();

function sanitize(raw: Partial<TransitConfig> | null): TransitConfig {
  const lanes = Math.min(64, Math.max(1, Math.round(Number(raw?.lanes) || FREE_LANES)));
  const chunkBytes = raw?.chunkBytes === 65536 ? 65536 : 16384;
  const hopRadius = Math.min(4, Math.max(1, Math.round(Number(raw?.hopRadius) || 2)));
  const peerTimeoutMs = Math.min(
    300_000,
    Math.max(5_000, Math.round(Number(raw?.peerTimeoutMs) || DEFAULT_TRANSIT.peerTimeoutMs)),
  );
  const heartbeatMs = Math.min(
    120_000,
    Math.max(2_000, Math.round(Number(raw?.heartbeatMs) || DEFAULT_TRANSIT.heartbeatMs)),
  );
  return { lanes, chunkBytes, hopRadius, peerTimeoutMs, heartbeatMs };
}

/** Geçerli yapılandırma (SSR'de varsayılan döner). */
export function transitConfig(): TransitConfig {
  if (cache) return cache;
  if (typeof localStorage === "undefined") return DEFAULT_TRANSIT;
  try {
    const raw = localStorage.getItem(KEY);
    cache = sanitize(raw ? (JSON.parse(raw) as Partial<TransitConfig>) : null);
  } catch {
    cache = DEFAULT_TRANSIT;
  }
  return cache;
}

/** Yapılandırmayı günceller ve dinleyicileri uyarır. */
export function setTransitConfig(patch: Partial<TransitConfig>): TransitConfig {
  const next = sanitize({ ...transitConfig(), ...patch });
  cache = next;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  listeners.forEach((fn) => fn(next));
  return next;
}

export function onTransitConfigChange(fn: (c: TransitConfig) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Abonelik paketine göre hat sayısını uygular (5 ücretsiz + ek hatlar). */
export function applyPlanLanes(plan: "free" | "community" | "enterprise" | "operator"): number {
  const lanes =
    plan === "operator" ? 32 : plan === "enterprise" ? 16 : plan === "community" ? 8 : FREE_LANES;
  return setTransitConfig({ lanes }).lanes;
}
