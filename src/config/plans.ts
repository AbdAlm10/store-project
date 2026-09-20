export type PlanId = "trial" | "basic" | "pro";

/** Use Number.POSITIVE_INFINITY for unlimited entitlements. */
export type PlanLimits = {
  maxProducts: number;
  maxImagesPerProduct: number;
  maxCategories: number;
  maxOptionsPerProduct: number;
  maxNavActions: number;
  advancedAnalytics: boolean;
  /** When false, only BASIC_THEME_COLOR_KEYS are editable. */
  fullThemeCustomization: boolean;
  customDomain: boolean;
  dedicatedSupport: boolean;
};

export type BillingPeriod = "monthly" | "yearly";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  priceMonthlyUsd: number;
  priceYearlyUsd: number;
  limits: PlanLimits;
  highlighted?: boolean;
};

/** Theme tokens Basic may edit; the rest stay locked / Pro-only. */
export const BASIC_THEME_COLOR_KEYS = [
  "accent",
  "background",
  "surface",
  "text",
] as const;

/**
 * Centralized plan catalog. EntitlementService reads from here —
 * never hardcode limits in UI or random services.
 */
const BASIC_LIMITS: PlanLimits = {
  maxProducts: 50,
  maxImagesPerProduct: 2,
  maxCategories: 4,
  maxOptionsPerProduct: 3,
  maxNavActions: 1,
  advancedAnalytics: false,
  fullThemeCustomization: false,
  customDomain: false,
  dedicatedSupport: false,
};

const PRO_LIMITS: PlanLimits = {
  maxProducts: 1000,
  maxImagesPerProduct: 10,
  maxCategories: Number.POSITIVE_INFINITY,
  maxOptionsPerProduct: Number.POSITIVE_INFINITY,
  maxNavActions: Number.POSITIVE_INFINITY,
  advancedAnalytics: true,
  fullThemeCustomization: true,
  customDomain: true,
  dedicatedSupport: true,
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  trial: {
    id: "trial",
    name: "Free Trial",
    description:
      "Basic catalog limits plus Pro analytics, options, theming, and support.",
    priceMonthlyUsd: 0,
    priceYearlyUsd: 0,
    // Basic quotas — only these four upgrade to Pro during the trial.
    limits: {
      ...BASIC_LIMITS,
      advancedAnalytics: true,
      maxOptionsPerProduct: Number.POSITIVE_INFINITY,
      fullThemeCustomization: true,
      dedicatedSupport: true,
    },
  },
  basic: {
    id: "basic",
    name: "Basic",
    description: "A clean catalog link for social sellers getting started.",
    priceMonthlyUsd: 7,
    priceYearlyUsd: 60,
    limits: { ...BASIC_LIMITS },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Higher limits, full analytics, and complete customization.",
    priceMonthlyUsd: 15,
    priceYearlyUsd: 150,
    highlighted: true,
    limits: { ...PRO_LIMITS },
  },
};

/** Free trial length in days. Keep as a plain constant — env vars without
 * NEXT_PUBLIC_ are server-only and would hydrate-mismatch in client components. */
export const TRIAL_DAYS = 10;

/** Discount applied when subscribing before the free trial ends. */
export const EARLY_BIRD_DISCOUNT: Record<"basic" | "pro", number> = {
  basic: 0.05,
  pro: 0.3,
};

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}

export function isUnlimited(value: number): boolean {
  return !Number.isFinite(value);
}

export function planPrice(
  plan: PlanDefinition,
  period: BillingPeriod,
): number {
  return period === "yearly" ? plan.priceYearlyUsd : plan.priceMonthlyUsd;
}

export function earlyBirdPrice(
  planId: "basic" | "pro",
  period: BillingPeriod,
): number {
  const plan = PLANS[planId];
  const base = planPrice(plan, period);
  const discount = EARLY_BIRD_DISCOUNT[planId];
  // Ceil so yearly lands on clean marketing prices ($95 / $210).
  return Math.ceil(base * (1 - discount) - Number.EPSILON);
}
