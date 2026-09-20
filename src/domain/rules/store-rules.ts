import { AppError } from "@/domain/errors";
import type { MembershipRole, StoreStatus } from "@/domain/types/enums";
import type { Store, StoreMember, Subscription } from "@/domain/types/entities";

const ROLE_RANK: Record<MembershipRole, number> = {
  staff: 1,
  manager: 2,
  owner: 3,
};

export function assertStoreActive(store: Store): void {
  if (store.status === "suspended") {
    throw new AppError(
      "STORE_RESTRICTED",
      "This store has been suspended.",
    );
  }
  if (store.status === "restricted") {
    throw new AppError(
      "STORE_RESTRICTED",
      "This store is restricted. Update your subscription to continue.",
    );
  }
}

export function assertCanManageStore(
  membership: StoreMember | null,
  minimumRole: MembershipRole = "staff",
): void {
  if (!membership) {
    throw new AppError("FORBIDDEN", "You do not have access to this store.");
  }
  if (ROLE_RANK[membership.role] < ROLE_RANK[minimumRole]) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    );
  }
}

export function isSubscriptionUsable(subscription: Subscription): boolean {
  if (
    subscription.status !== "trialing" &&
    subscription.status !== "active" &&
    subscription.status !== "past_due"
  ) {
    return false;
  }
  // Trial ends by date even if status was never flipped by a cron job.
  if (subscription.status === "trialing" && subscription.trialEndsAt) {
    const ends = Date.parse(subscription.trialEndsAt);
    if (Number.isFinite(ends) && ends < Date.now()) return false;
  }
  return true;
}

export function assertSubscriptionAllowsWrites(
  subscription: Subscription,
): void {
  if (!isSubscriptionUsable(subscription)) {
    throw new AppError(
      "SUBSCRIPTION_REQUIRED",
      "Your subscription is inactive. Renew to continue managing this store.",
    );
  }
}

export function canPublishPublicly(status: StoreStatus): boolean {
  return status === "published";
}

export function discountPercent(
  price: number,
  compareAtPrice: number | null | undefined,
): number | null {
  if (!compareAtPrice || compareAtPrice <= price || price < 0) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
