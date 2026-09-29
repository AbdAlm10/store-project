import { TRIAL_DAYS, type BillingPeriod, type PlanId } from "@/config/plans";
import { AppError } from "@/domain/errors";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
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

  async changeStorePlan(
    storeId: string,
    planId: PlanId,
    billingPeriod: BillingPeriod,
  ) {
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
    const trial = planId === "trial";
    if (
      row.subscription?.planId === planId &&
      row.subscription.billingPeriod === billingPeriod
    ) {
      return this.platform.updateSubscription(row.subscription.id, {
        status: trial ? "trialing" : "active",
      });
    }
    const endsAt = new Date();
    endsAt.setDate(
      endsAt.getDate() + (trial ? TRIAL_DAYS : billingPeriod === "yearly" ? 365 : 30),
    );
    const iso = endsAt.toISOString();
    const patch = {
      planId,
      billingPeriod,
      status: trial ? ("trialing" as const) : ("active" as const),
      trialEndsAt: trial ? iso : null,
      currentPeriodEnd: trial ? iso : iso,
    };
    if (!row.subscription) {
      return this.platform.createSubscription({
        storeId,
        ...patch,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      });
    }
    return this.platform.updateSubscription(row.subscription.id, patch);
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
