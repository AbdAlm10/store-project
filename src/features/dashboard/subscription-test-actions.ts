"use server";

// Reserved for the future subscription-management dashboard feature.

import { TRIAL_DAYS, type PlanId } from "@/config/plans";
import { getServices } from "@/infrastructure/container";
import { revalidatePath } from "next/cache";

const TEST_PLAN_IDS: PlanId[] = ["trial", "basic", "pro"];

export async function simulateSubscriptionExpiry(formData: FormData) {
  if (process.env.NODE_ENV === "production") return;

  const planId = formData.get("planId");
  if (typeof planId !== "string" || !TEST_PLAN_IDS.includes(planId as PlanId)) {
    return;
  }

  const services = getServices();
  const stores = await services.stores.listMyStores();
  const store = stores[0];
  if (!store) return;

  await services.entitlements.simulateExpiredPlan(store.id, planId as PlanId);
  await services.stores.restrictForExpiredSubscription(store.id);
  revalidatePath("/dashboard/subscription");
  revalidatePath("/dashboard");
  revalidatePath(`/${store.slug}`);
}

export async function restoreSubscriptionAfterTest() {
  if (process.env.NODE_ENV === "production") return;

  const services = getServices();
  const stores = await services.stores.listMyStores();
  const store = stores[0];
  if (!store) return;

  const subscription = await services.entitlements.getSubscription(store.id);
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + (subscription.planId === "trial" ? TRIAL_DAYS : 30));

  await services.entitlements.restoreSubscriptionForTest(store.id, endsAt.toISOString());
  await services.stores.restoreAfterSubscriptionTest(store.id);
  revalidatePath("/dashboard/subscription");
  revalidatePath("/dashboard");
  revalidatePath(`/${store.slug}`);
}