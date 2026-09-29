import type { BillingPeriod, PlanId } from "@/config/plans";
import type { Profile, Store, Subscription } from "@/domain/types/entities";
import type { StoreStatus, SubscriptionStatus } from "@/domain/types/enums";

export type AdminStoreRow = {
  store: Store;
  subscription: Subscription | null;
  owner: Profile | null;
};

export type AdminSubscriptionPatch = {
  planId?: PlanId;
  billingPeriod?: BillingPeriod;
  status?: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
};

export type AdminStorePatch = {
  status?: StoreStatus;
  /** Admin platform lock (sets suspended_at; pairs with restricted when locking). */
  suspended?: boolean;
};

export interface PlatformAdminRepository {
  listUsers(): Promise<Profile[]>;
  listStoresWithSubscriptions(): Promise<AdminStoreRow[]>;
  setUserSuspended(userId: string, suspended: boolean): Promise<void>;
  updateStore(storeId: string, patch: AdminStorePatch): Promise<Store>;
  updateSubscription(
    subscriptionId: string,
    patch: AdminSubscriptionPatch,
  ): Promise<Subscription>;
  createSubscription(
    input: Omit<Subscription, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ): Promise<Subscription>;
}
