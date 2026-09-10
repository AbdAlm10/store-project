import { getPlan, type PlanId } from "@/config/plans";
import { AppError } from "@/domain/errors";
import type { Subscription } from "@/domain/types/entities";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import type { SubscriptionRepository } from "@/application/ports/repositories";

export class EntitlementService {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async getSubscription(storeId: string): Promise<Subscription> {
    const sub = await this.subscriptions.findByStoreId(storeId);
    if (!sub) {
      throw new AppError(
        "SUBSCRIPTION_REQUIRED",
        "No subscription found for this store.",
      );
    }
    return sub;
  }

  async assertCanCreateProduct(
    storeId: string,
    currentProductCount: number,
  ): Promise<void> {
    const sub = await this.getSubscription(storeId);
    if (!isSubscriptionUsable(sub)) {
      throw new AppError(
        "SUBSCRIPTION_REQUIRED",
        "Your subscription is inactive.",
      );
    }
    const plan = getPlan(sub.planId);
    if (currentProductCount >= plan.limits.maxProducts) {
      throw new AppError(
        "LIMIT_REACHED",
        `Your ${plan.name} plan allows up to ${plan.limits.maxProducts} products.`,
        { details: { limit: plan.limits.maxProducts } },
      );
    }
  }

  async canUseAdvancedAnalytics(storeId: string): Promise<boolean> {
    const sub = await this.getSubscription(storeId);
    if (!isSubscriptionUsable(sub)) return false;
    return getPlan(sub.planId).limits.advancedAnalytics;
  }

  async canUseCustomDomain(storeId: string): Promise<boolean> {
    const sub = await this.getSubscription(storeId);
    if (!isSubscriptionUsable(sub)) return false;
    return getPlan(sub.planId).limits.customDomain;
  }

  async maxImagesPerProduct(storeId: string): Promise<number> {
    const sub = await this.getSubscription(storeId);
    return getPlan(sub.planId).limits.maxImagesPerProduct;
  }

  effectivePlanId(sub: Subscription): PlanId {
    return sub.planId;
  }
}
