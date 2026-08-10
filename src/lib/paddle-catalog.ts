/**
 * Tedbirge ürün / fiyat kataloğu.
 *
 * Buradaki kimlikler Paddle'daki human-readable `external_id` değerleridir ve
 * test (sandbox) ile canlı (live) ortamda aynıdır. Paddle'ın iç kimlikleri
 * (pri_..., pro_...) çalışma anında `resolvePaddlePrice` ile çözülür.
 */

export const PRODUCTS = {
  pro: "tedbirge_pro",
  enterprise: "tedbirge_enterprise",
} as const;

export const PRICES = {
  proMonthly: "tedbirge_pro_monthly",
  proYearly: "tedbirge_pro_yearly",
  enterpriseMonthly: "tedbirge_enterprise_monthly",
  enterpriseYearly: "tedbirge_enterprise_yearly",
} as const;

export type PlanKey = keyof typeof PRODUCTS;

export type PlanDefinition = {
  key: PlanKey;
  productId: string;
  label: string;
  minNodes: number;
  maxNodes: number;
  prices: { month: string; year: string };
  /** Düğüm başına birim fiyat (EUR) */
  unitPrice: { month: number; year: number };
};

/** Ücretsiz Community katmanının düğüm tavanı. */
export const COMMUNITY_NODE_LIMIT = 5;

export const PLANS: Record<PlanKey, PlanDefinition> = {
  pro: {
    key: "pro",
    productId: PRODUCTS.pro,
    label: "Pro",
    minNodes: 6,
    maxNodes: 24,
    prices: { month: PRICES.proMonthly, year: PRICES.proYearly },
    // 12 €/düğüm/ay · yıllıkta 2 ay hediye (10 × 12 = 120)
    unitPrice: { month: 12, year: 120 },
  },
  enterprise: {
    key: "enterprise",
    productId: PRODUCTS.enterprise,
    label: "Enterprise",
    minNodes: 25,
    maxNodes: 1000,
    prices: { month: PRICES.enterpriseMonthly, year: PRICES.enterpriseYearly },
    // Hacim indirimi: düğüm başı birim fiyat Pro'dan düşüktür.
    unitPrice: { month: 8, year: 80 },
  },
};

/** Paddle product external_id -> plan tanımı */
export function planByProductId(productId: string): PlanDefinition | undefined {
  return Object.values(PLANS).find((p) => p.productId === productId);
}

/** Paddle price external_id -> plan tanımı */
export function planByPriceId(priceId: string): PlanDefinition | undefined {
  return Object.values(PLANS).find((p) => p.prices.month === priceId || p.prices.year === priceId);
}

/** Bilinmeyen ürün/fiyat kimliklerini erken yakalamak için */
export function isKnownPrice(priceId: string): boolean {
  return Boolean(planByPriceId(priceId));
}

/**
 * Satın alınan adedi plan sınırlarına sabitler. Community (lisanssız) 5 düğüm,
 * Pro 6–24, Enterprise 25+. Kota denetimi bu tek fonksiyondan beslenir.
 */
export function resolveNodeLimit(plan: PlanDefinition, quantity?: number | null): number {
  const q = Number.isFinite(quantity) ? Number(quantity) : plan.minNodes;
  return Math.min(plan.maxNodes, Math.max(plan.minNodes, Math.round(q)));
}

/** Düğüm sayısına göre gereken en küçük ücretli plan (yoksa Community yeterli). */
export function planForNodeCount(nodes: number): PlanDefinition | null {
  if (nodes <= COMMUNITY_NODE_LIMIT) return null;
  return (
    Object.values(PLANS)
      .sort((a, b) => a.minNodes - b.minNodes)
      .find((p) => nodes <= p.maxNodes) ?? PLANS.enterprise
  );
}
