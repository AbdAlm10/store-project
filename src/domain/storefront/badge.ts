import type { PlanId } from "@/config/plans";

/** Basic and trial storefronts carry the homepage credit. Pro does not. */
export function showsDukkanStorefrontBadge(planId: PlanId | null): boolean {
  return planId !== "pro";
}
