import { getPlan, isUnlimited, type PlanId, type PlanLimits } from "@/config/plans";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import type { Subscription } from "@/domain/types/entities";

/**
 * A live trial uses Basic. A live Basic or Pro stays on that plan.
 * Anything else — including an ended trial or paid period — is Free.
 * Rows are not deleted; callers hide whatever no longer fits.
 */
export function effectivePlanId(
  subscription: {
    planId: PlanId;
    status: string;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
  } | null | undefined,
): PlanId {
  if (!subscription || !isSubscriptionUsable(subscription as Subscription)) return "free";
  return subscription.planId;
}

export function limitsForSubscription(
  subscription: Parameters<typeof effectivePlanId>[0],
): PlanLimits {
  return getPlan(effectivePlanId(subscription)).limits;
}

/** Paid Basic/Pro does not consume the one-free-store slot. Trial and Free do. */
export function occupiesFreeSlot(
  subscription: Parameters<typeof effectivePlanId>[0],
): boolean {
  if (!subscription || !isSubscriptionUsable(subscription as Subscription)) return true;
  return subscription.planId !== "basic" && subscription.planId !== "pro";
}

export function oldestVisible<T>(
  items: T[],
  limit: number,
  rank: (item: T) => string,
): T[] {
  if (isUnlimited(limit)) return items;
  return [...items].sort((a, b) => rank(a).localeCompare(rank(b))).slice(0, Math.max(0, limit));
}

export function publicThemeOverrides<T>(planId: PlanId | null, overrides: T): T | null {
  if (!planId || getPlan(planId).limits.themeAccess === "none") return null;
  return overrides;
}

export function visibleProductIds(
  products: Array<{ id: string; createdAt: string; status?: string }>,
  limit: number,
): Set<string> {
  const published = products.filter((item) => !item.status || item.status === "published");
  return new Set(
    oldestVisible(published, limit, (item) => `${item.createdAt}\u0000${item.id}`).map(
      (item) => item.id,
    ),
  );
}
