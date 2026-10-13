import { AppError } from "@/domain/errors";
import type { Store, Subscription } from "@/domain/types/entities";

/**
 * Customers must not see a suspended store or one frozen after 60 quiet days.
 * An ended trial stays public on the Free catalog. Data is kept either way.
 */
export function isHiddenFromCustomers(
  store: Store,
  _subscription?: Subscription | null | undefined,
): boolean {
  if (store.status === "suspended" || store.suspendedAt) return true;
  if (store.status === "restricted") return true;
  return false;
}

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
 * Admin lock (suspended_at) or a restricted freeze hides the store.
 * An ended subscription stays published and is served with Free limits.
 */
export function resolveStorefrontAccess(
  store: Store,
  _subscription: Subscription | null | undefined,
): Store {
  if (store.status === "suspended") {
    throw new AppError("NOT_FOUND", "Store not found.");
  }
  if (isStorefrontLocked(store)) {
    return toLockedStore(store);
  }
  return store;
}
