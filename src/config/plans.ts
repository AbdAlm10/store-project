export type PlanId = "trial" | "basic" | "pro";

export type PlanLimits = {
  maxProducts: number;
  maxImagesPerProduct: number;
  advancedAnalytics: boolean;
  customDomain: boolean;
  customThemes: boolean;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  priceMonthlyUsd: number | null;
  limits: PlanLimits;
  highlighted?: boolean;
};

/**
 * Centralized plan catalog. EntitlementService reads from here —
 * never hardcode limits in UI or random services.
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  trial: {
    id: "trial",
    name: "Free Trial",
    description: "Full Basic features while you launch your storefront.",
    priceMonthlyUsd: 0,
    limits: {
      maxProducts: 50,
      maxImagesPerProduct: 8,
      advancedAnalytics: false,
      customDomain: false,
      customThemes: true,
    },
  },
  basic: {
    id: "basic",
    name: "Basic",
    description: "Perfect for social sellers who need one clean catalog link.",
    priceMonthlyUsd: 9,
    limits: {
      maxProducts: 100,
      maxImagesPerProduct: 8,
      advancedAnalytics: false,
      customDomain: false,
      customThemes: true,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Higher limits, richer analytics, and room to grow.",
    priceMonthlyUsd: 29,
    highlighted: true,
    limits: {
      maxProducts: 1000,
      maxImagesPerProduct: 16,
      advancedAnalytics: true,
      customDomain: true,
      customThemes: true,
    },
  },
};

export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 14);

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}
