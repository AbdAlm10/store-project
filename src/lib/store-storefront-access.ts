import { AppError } from "@/domain/errors";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import type { Store, Subscription } from "@/domain/types/entities";

/** Whether the public storefront should show the subscription lock screen. */
export function isStorefrontLocked(store: Store): boolean {
  if (store.status === "suspended") return true;
  if (store.suspendedAt) return true;
  if (store.status === "restricted") return true;
  return false;
}

export function toLockedStore(store: Store): Store {
  return { ...store, status: "restricted" };
}

/**
 * Normalize store for public catalog / storefront page.
 * Admin lock (suspended_at), DB restricted status, or inactive subscription → locked.
 */
export function resolveStorefrontAccess(
  store: Store,
  subscription: Subscription | null | undefined,
): Store {
  if (store.status === "suspended") {
    throw new AppError("NOT_FOUND", "Store not found.");
  }
  if (isStorefrontLocked(store)) {
    return toLockedStore(store);
  }
  if (subscription && !isSubscriptionUsable(subscription)) {
    return toLockedStore(store);
  }
  return store;
}
