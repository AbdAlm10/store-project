import { getPlan, type PlanId } from "@/config/plans";

/** Free storefronts always show «متجري على دكّان». Basic and Pro do not. */
export function showsDukkanStorefrontBadge(planId: PlanId | null): boolean {
  if (!planId || planId === "free") return true;
  return getPlan(planId).limits.showPlatformBadge;
}
