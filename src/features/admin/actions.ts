"use server";

import type { BillingPeriod, PlanId } from "@/config/plans";
import { AppError } from "@/domain/errors";
import type { StoreStatus, SubscriptionStatus } from "@/domain/types/enums";
import { refuseDemoWrite } from "@/features/demo/write-guard";
import { getServices } from "@/infrastructure/container";
import {
  storeCategoriesTag,
  storeIdTag,
  storeProductsTag,
  storeTag,
} from "@/lib/cache-tags";
import { revalidatePath, updateTag } from "next/cache";

function revalidateAdmin() {
  revalidatePath("/admin");
}

function revalidateMerchantStore(slug: string, storeId: string) {
  revalidatePath(`/${slug}`, "page");
  revalidatePath(`/${slug}`, "layout");
  updateTag("stores");
  updateTag(storeTag(slug));
  updateTag(storeProductsTag(slug));
  updateTag(storeCategoriesTag(slug));
  updateTag(storeIdTag(storeId));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/subscription");
}

function readString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function runAdminAction(fn: () => Promise<void>) {
  if (await refuseDemoWrite()) return;
  try {
    await fn();
    revalidateAdmin();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw error;
  }
}

export async function adminSetUserSuspended(formData: FormData) {
  const userId = readString(formData, "userId");
  const suspended = formData.get("suspended") === "true";
  if (!userId) return;
  await runAdminAction(async () => {
    await getServices().admin.setUserSuspended(userId, suspended);
  });
}

export async function adminSetStoreStatus(formData: FormData) {
  const storeId = readString(formData, "storeId");
  const status = readString(formData, "status") as StoreStatus | null;
  if (!storeId || !status) return;
  await runAdminAction(async () => {
    await getServices().admin.setStoreStatus(storeId, status);
  });
}

export async function adminToggleStoreSuspended(formData: FormData) {
  const storeId = readString(formData, "storeId");
  const suspended = formData.get("suspended") === "true";
  if (!storeId) return;
  await runAdminAction(async () => {
    const { slug } = await getServices().admin.setStoreLockedByAdmin(
      storeId,
      suspended,
    );
    revalidatePath(`/${slug}`, "page");
    revalidatePath(`/${slug}`, "layout");
    updateTag("stores");
    updateTag(storeTag(slug));
    updateTag(storeProductsTag(slug));
    updateTag(storeCategoriesTag(slug));
    updateTag(storeIdTag(storeId));
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/subscription");
  });
}

export async function adminChangeStorePlan(formData: FormData) {
  const storeId = readString(formData, "storeId");
  const planId = readString(formData, "planId") as PlanId | null;
  const billingPeriod = readString(formData, "billingPeriod") as BillingPeriod | null;
  if (!storeId || !planId || !billingPeriod) return;
  await runAdminAction(async () => {
    const result = await getServices().admin.changeStorePlan(
      storeId,
      planId,
      billingPeriod,
    );
    revalidateMerchantStore(result.slug, result.storeId);
  });
}

export async function adminUpdateSubscription(formData: FormData) {
  const subscriptionId = readString(formData, "subscriptionId");
  const status = readString(formData, "status") as SubscriptionStatus | null;
  const planId = readString(formData, "planId") as PlanId | null;
  if (!subscriptionId) return;
  await runAdminAction(async () => {
    await getServices().admin.updateSubscription(subscriptionId, {
      ...(status ? { status } : {}),
      ...(planId ? { planId } : {}),
    });
  });
}

export async function adminExtendSubscription(formData: FormData) {
  const subscriptionId = readString(formData, "subscriptionId");
  const daysRaw = readString(formData, "days");
  if (!subscriptionId || !daysRaw) return;
  const days = Number.parseInt(daysRaw, 10);
  if (!Number.isFinite(days) || days < 1 || days > 365) return;

  await runAdminAction(async () => {
    const result = await getServices().admin.extendSubscription(subscriptionId, days);
    revalidateMerchantStore(result.slug, result.storeId);
  });
}
