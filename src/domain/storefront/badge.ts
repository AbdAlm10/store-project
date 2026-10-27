import { getPlan, type PlanId } from "@/config/plans";

/** Free storefronts always show «متجري على دكّان». Basic and Pro do not. */
export function showsDukkanStorefrontBadge(planId: PlanId | null): boolean {
  if (!planId || planId === "free") return true;
  return getPlan(planId).limits.showPlatformBadge;
}

/**
 * Cart confirmation promo. Trial and Basic hide the storefront badge and
 * still show this line. Pro hides it while the Dukkan badge is hidden.
 */
export function showsCartOrderPromo(planId: PlanId | null): boolean {
  return planId !== "pro" || showsDukkanStorefrontBadge(planId);
}
