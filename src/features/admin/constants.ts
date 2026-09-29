import type { PlanId } from "@/config/plans";
import type { StoreStatus, SubscriptionStatus } from "@/domain/types/enums";

export const ADMIN_PLAN_IDS: PlanId[] = ["trial", "basic", "pro"];

export const ADMIN_STORE_STATUSES: StoreStatus[] = [
  "draft",
  "published",
  "suspended",
  "restricted",
];

export const ADMIN_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "restricted",
];
