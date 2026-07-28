/**
 * Tedbirge ürün / fiyat kataloğu.
 *
 * Buradaki kimlikler Paddle'daki human-readable `external_id` değerleridir ve
 * test (sandbox) ile canlı (live) ortamda aynıdır. Paddle'ın iç kimlikleri
 * (pri_..., pro_...) çalışma anında `resolvePaddlePrice` ile çözülür.
 */

export const PRODUCTS = {
  enterprise: "tedbirge_enterprise",
} as const;

export const PRICES = {
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

export const PLANS: Record<PlanKey, PlanDefinition> = {
  enterprise: {
    key: "enterprise",
    productId: PRODUCTS.enterprise,
    label: "Enterprise",
    minNodes: 25,
    maxNodes: 1000,
    prices: { month: PRICES.enterpriseMonthly, year: PRICES.enterpriseYearly },
    unitPrice: { month: 49, year: 500 },
  },
};

/** Paddle product external_id -> plan tanımı */
export function planByProductId(productId: string): PlanDefinition | undefined {
  return Object.values(PLANS).find((p) => p.productId === productId);
}

/** Paddle price external_id -> plan tanımı */
export function planByPriceId(priceId: string): PlanDefinition | undefined {
  return Object.values(PLANS).find(
    (p) => p.prices.month === priceId || p.prices.year === priceId,
  );
}

/** Bilinmeyen ürün/fiyat kimliklerini erken yakalamak için */
export function isKnownPrice(priceId: string): boolean {
  return Boolean(planByPriceId(priceId));
}
