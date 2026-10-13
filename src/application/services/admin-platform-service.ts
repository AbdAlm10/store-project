import type { BillingPeriod, PlanId } from "@/config/plans";
import { activationCharge } from "@/domain/billing/early-bird";
import { extendFrom, nextPeriodEnd } from "@/domain/billing/period";
import type { EarlyBirdLedger } from "@/infrastructure/billing/early-bird-ledger";
import { AppError } from "@/domain/errors";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import type { Store } from "@/domain/types/entities";
import type { ReferralService } from "@/application/services/referral-service";
import type {
  AdminStorePatch,
  AdminStoreRow,
  AdminSubscriptionPatch,
  PlatformAdminRepository,
} from "@/application/ports/platform-admin";
import type { Profile } from "@/domain/types/entities";
import type { StoreStatus, SubscriptionStatus } from "@/domain/types/enums";
import type { AuthService } from "@/application/services/auth-service";

const PLAN_IDS: PlanId[] = ["trial", "basic", "pro"];
const STORE_STATUSES: StoreStatus[] = [
  "draft",
  "published",
  "suspended",
  "restricted",
];
const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "restricted",
];

export type AdminOverview = {
  users: Profile[];
  stores: AdminStoreRow[];
  stats: {
    userCount: number;
    storeCount: number;
    activeSubscriptions: number;
    suspendedUsers: number;
    suspendedStores: number;
  };
};

export class AdminPlatformService {
  constructor(
    private readonly auth: AuthService,
    private readonly platform: PlatformAdminRepository,
    private readonly referrals?: Pick<ReferralService, "grantOnFirstPaidActivation">,
    private readonly earlyBird?: EarlyBirdLedger,
  ) {}

  async getOverview(): Promise<AdminOverview> {
    await this.auth.requireAdmin();
    const [users, stores] = await Promise.all([
      this.platform.listUsers(),
      this.platform.listStoresWithSubscriptions(),
    ]);
    const activeSubscriptions = stores.filter(
      (row) => row.subscription && isSubscriptionUsable(row.subscription),
    ).length;
    return {
      users,
      stores,
      stats: {
        userCount: users.length,
        storeCount: stores.length,
        activeSubscriptions,
        suspendedUsers: users.filter((u) => u.suspendedAt).length,
        suspendedStores: stores.filter(
          (row) =>
            row.store.suspendedAt ||
            row.store.status === "restricted" ||
            row.store.status === "suspended",
        ).length,
      },
    };
  }

  async setUserSuspended(userId: string, suspended: boolean): Promise<void> {
    const { profile } = await this.auth.requireAdmin();
    if (profile.id === userId && suspended) {
      throw new AppError("FORBIDDEN", "You cannot suspend your own account.");
    }
    await this.platform.setUserSuspended(userId, suspended);
  }

  async updateStore(storeId: string, patch: AdminStorePatch) {
    await this.auth.requireAdmin();
    return this.platform.updateStore(storeId, patch);
  }

  async updateSubscription(
    subscriptionId: string,
    patch: AdminSubscriptionPatch,
  ) {
    await this.auth.requireAdmin();
    if (patch.planId !== undefined && !PLAN_IDS.includes(patch.planId)) {
      throw new AppError("VALIDATION", "Invalid plan.");
    }
    if (
      patch.status !== undefined &&
      !SUBSCRIPTION_STATUSES.includes(patch.status)
    ) {
      throw new AppError("VALIDATION", "Invalid subscription status.");
    }
    return this.platform.updateSubscription(subscriptionId, patch);
  }

  /**
   * Manual Sham Cash activation. Choosing a plan and period starts or extends
   * that period. The same plan and period again renews from the current end
   * when that end is still in the future.
   */
  async changeStorePlan(
    storeId: string,
    planId: PlanId,
    billingPeriod: BillingPeriod,
  ): Promise<{ slug: string; storeId: string }> {
    await this.auth.requireAdmin();
    if (!PLAN_IDS.includes(planId)) {
      throw new AppError("VALIDATION", "خطة غير صالحة.");
    }
    if (billingPeriod !== "monthly" && billingPeriod !== "yearly") {
      throw new AppError("VALIDATION", "فترة فوترة غير صالحة.");
    }
    const rows = await this.platform.listStoresWithSubscriptions();
    const row = rows.find((item) => item.store.id === storeId);
    if (!row) {
      throw new AppError("NOT_FOUND", "المتجر غير موجود.");
    }
    const now = new Date();
    const trial = planId === "trial";
    const iso = nextPeriodEnd({
      now,
      planId,
      billingPeriod,
      previous: row.subscription
        ? {
            planId: row.subscription.planId,
            currentPeriodEnd: row.subscription.currentPeriodEnd,
          }
        : null,
    }).toISOString();
    const patch = {
      planId,
      billingPeriod,
      status: trial ? ("trialing" as const) : ("active" as const),
      trialEndsAt: trial ? iso : null,
      currentPeriodEnd: iso,
    };
    if (!row.subscription) {
      await this.platform.createSubscription({
        storeId,
        ...patch,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      });
    } else {
      await this.platform.updateSubscription(row.subscription.id, patch);
    }
    await this.publishIfExpiryLocked(row.store);
    if (planId === "basic" || planId === "pro") {
      await this.recordEarlyBirdCharge({
        userId: row.store.ownerId,
        storeId,
        planId,
        billingPeriod,
        now,
      });
      try {
        await this.referrals?.grantOnFirstPaidActivation({
          referredUserId: row.store.ownerId,
          storeId,
        });
      } catch (error) {
        console.error("referral grant failed after plan activation", error);
      }
    }
    return { slug: row.store.slug, storeId: row.store.id };
  }

  /** Extra days from the current end when it is still in the future. */
  async extendSubscription(
    subscriptionId: string,
    days: number,
  ): Promise<{ slug: string; storeId: string }> {
    await this.auth.requireAdmin();
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new AppError("VALIDATION", "مدة التمديد غير صالحة.");
    }
    const rows = await this.platform.listStoresWithSubscriptions();
    const row = rows.find((item) => item.subscription?.id === subscriptionId);
    if (!row?.subscription) {
      throw new AppError("NOT_FOUND", "الاشتراك غير موجود.");
    }
    const sub = row.subscription;
    const trial = sub.planId === "trial" || sub.status === "trialing";
    const iso = extendFrom(
      trial ? sub.trialEndsAt : sub.currentPeriodEnd,
      days,
      new Date(),
    ).toISOString();
    await this.platform.updateSubscription(sub.id, {
      status: trial ? "trialing" : "active",
      trialEndsAt: trial ? iso : sub.trialEndsAt,
      currentPeriodEnd: trial ? iso : iso,
    });
    await this.publishIfExpiryLocked(row.store);
    return { slug: row.store.slug, storeId: row.store.id };
  }

  /** Writes the Sham Cash amount for the first paid year. Trial does not consume it. */
  private async recordEarlyBirdCharge(input: {
    userId: string;
    storeId: string;
    planId: "basic" | "pro";
    billingPeriod: BillingPeriod;
    now: Date;
  }): Promise<void> {
    if (!this.earlyBird) return;
    try {
      const grant = await this.earlyBird.findByUserId(input.userId);
      const charge = activationCharge({
        grant,
        planId: input.planId,
        billingPeriod: input.billingPeriod,
        now: input.now,
      });
      if (!charge.earlyBird || !charge.discountUntil) return;
      await this.earlyBird.recordActivation({
        userId: input.userId,
        storeId: input.storeId,
        planId: input.planId,
        billingPeriod: input.billingPeriod,
        chargedAmountUsd: charge.amountUsd,
        discountUntil: charge.discountUntil,
        appliedAt: input.now.toISOString(),
      });
    } catch (error) {
      console.error("early bird charge record failed", error);
    }
  }

  /** Reopen a store closed by expiry. An explicit admin suspension stays closed. */
  private async publishIfExpiryLocked(store: Store): Promise<void> {
    if (store.status === "restricted" && !store.suspendedAt) {
      await this.platform.updateStore(store.id, {
        status: "published",
        suspended: false,
      });
    }
  }

  async setStoreStatus(storeId: string, status: StoreStatus) {
    await this.auth.requireAdmin();
    if (!STORE_STATUSES.includes(status)) {
      throw new AppError("VALIDATION", "Invalid store status.");
    }
    return this.platform.updateStore(storeId, { status });
  }

  /**
   * Platform admin stop/start — same effect as an expired plan:
   * public storefront locked, merchant dashboard restricted, subscription inactive.
   */
  async setStoreLockedByAdmin(
    storeId: string,
    locked: boolean,
  ): Promise<{ slug: string }> {
    await this.auth.requireAdmin();
    const rows = await this.platform.listStoresWithSubscriptions();
    const row = rows.find((item) => item.store.id === storeId);
    if (!row) {
      throw new AppError("NOT_FOUND", "المتجر غير موجود.");
    }

    if (locked) {
      const updated = await this.platform.updateStore(storeId, {
        status: "restricted",
        suspended: true,
      });
      if (updated.status !== "restricted" || !updated.suspendedAt) {
        throw new AppError(
          "INTERNAL",
          "تعذّر تقييد المتجر. تحقق من صلاحيات قاعدة البيانات.",
        );
      }
      if (row.subscription) {
        await this.platform.updateSubscription(row.subscription.id, {
          status: "expired",
        });
      } else {
        await this.platform.createSubscription({
          storeId,
          planId: "trial",
          billingPeriod: "monthly",
          status: "expired",
          trialEndsAt: null,
          currentPeriodEnd: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        });
      }
    } else {
      await this.platform.updateStore(storeId, {
        status: "published",
        suspended: false,
      });
      if (row.subscription) {
        const sub = row.subscription;
        const trial = sub.planId === "trial";
        const endAt = trial ? sub.trialEndsAt : sub.currentPeriodEnd;
        const stillValid = !endAt || Date.parse(endAt) > Date.now();
        await this.platform.updateSubscription(sub.id, {
          status: stillValid ? (trial ? "trialing" : "active") : "expired",
        });
      }
    }

    return { slug: row.store.slug };
  }

  static readonly planIds = PLAN_IDS;
  static readonly storeStatuses = STORE_STATUSES;
  static readonly subscriptionStatuses = SUBSCRIPTION_STATUSES;
}
