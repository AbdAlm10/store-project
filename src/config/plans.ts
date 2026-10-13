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
 * The SQL trigger in supabase/apply_pricing.sql must use the same counts.
 */
const BASIC_LIMITS: PlanLimits = {
  maxProducts: 150,
  maxImagesPerProduct: 3,
  maxCategories: 10,
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
    description: "Basic features for 10 days.",
    priceMonthlyUsd: 0,
    priceYearlyUsd: 0,
    limits: { ...BASIC_LIMITS },
  },
  basic: {
    id: "basic",
    name: "Basic",
    description: "Basic themes, basic analytics, and a social catalog.",
    priceMonthlyUsd: 4,
    priceYearlyUsd: 40,
    limits: { ...BASIC_LIMITS },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "1,000 products, a custom domain, and advanced analytics.",
    priceMonthlyUsd: 9,
    priceYearlyUsd: 90,
    highlighted: true,
    limits: { ...PRO_LIMITS },
  },
};

/** Free trial length in days. Keep as a plain constant — env vars without
 * NEXT_PUBLIC_ are server-only and would hydrate-mismatch in client components. */
export const TRIAL_DAYS = 10;

/**
 * 25% off the first paid year for the first 100 merchants.
 * Yearly is exactly ten monthly bills, so the discounted year is the
 * discounted month times ten (Basic 3 / 30, Pro 6.75 / 67.5).
 */
export const EARLY_BIRD_DISCOUNT = 0.25;
export const EARLY_BIRD_SLOT_LIMIT = 100;

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

/** Percent saved by paying yearly instead of twelve monthly bills. */
export function yearlySavingsPercent(plan: PlanDefinition): number {
  const fullYear = plan.priceMonthlyUsd * 12;
  if (fullYear <= 0) return 0;
  return Math.round(((fullYear - plan.priceYearlyUsd) / fullYear) * 100);
}

/** USD amount without trailing zeros: 6.75, 67.5, 4. */
export function formatUsd(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Price after the 25% first-year rate. Rounded to cents — do not ceil.
 * 9 × 0.75 stays 6.75 and 90 × 0.75 stays 67.5.
 */
export function earlyBirdPrice(
  planId: "basic" | "pro",
  period: BillingPeriod,
): number {
  const plan = PLANS[planId];
  const base = planPrice(plan, period);
  const raw = base * (1 - EARLY_BIRD_DISCOUNT);
  return Math.round((raw + Number.EPSILON) * 100) / 100;
}
