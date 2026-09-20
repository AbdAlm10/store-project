import {
  BASIC_THEME_COLOR_KEYS,
  getPlan,
  isUnlimited,
  type PlanId,
} from "@/config/plans";
import type { ThemeColorKey } from "@/config/themes";
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

  async assertCanCreateCategory(
    storeId: string,
    currentCategoryCount: number,
  ): Promise<void> {
    const sub = await this.getSubscription(storeId);
    if (!isSubscriptionUsable(sub)) {
      throw new AppError(
        "SUBSCRIPTION_REQUIRED",
        "Your subscription is inactive.",
      );
    }
    const plan = getPlan(sub.planId);
    const limit = plan.limits.maxCategories;
    if (!isUnlimited(limit) && currentCategoryCount >= limit) {
      throw new AppError(
        "LIMIT_REACHED",
        `Your ${plan.name} plan allows up to ${limit} categories.`,
        { details: { limit } },
      );
    }
  }

  async assertOptionSchemaAllowed(
    storeId: string,
    optionCount: number,
  ): Promise<void> {
    const sub = await this.getSubscription(storeId);
    const plan = getPlan(sub.planId);
    const limit = plan.limits.maxOptionsPerProduct;
    if (!isUnlimited(limit) && optionCount > limit) {
      throw new AppError(
        "LIMIT_REACHED",
        `Your ${plan.name} plan allows up to ${limit} options per product.`,
        { details: { limit } },
      );
    }
  }

  async assertNavActionsAllowed(
    storeId: string,
    actionCount: number,
  ): Promise<void> {
    const sub = await this.getSubscription(storeId);
    const plan = getPlan(sub.planId);
    const limit = plan.limits.maxNavActions;
    if (!isUnlimited(limit) && actionCount > limit) {
      throw new AppError(
        "LIMIT_REACHED",
        `Your ${plan.name} plan allows up to ${limit} navbar action buttons.`,
        { details: { limit } },
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

  async canCustomizeAllThemeColors(storeId: string): Promise<boolean> {
    const sub = await this.getSubscription(storeId);
    if (!isSubscriptionUsable(sub)) return false;
    return getPlan(sub.planId).limits.fullThemeCustomization;
  }

  async editableThemeColorKeys(storeId: string): Promise<ThemeColorKey[]> {
    const full = await this.canCustomizeAllThemeColors(storeId);
    if (full) {
      return [
        "background",
        "surface",
        "card",
        "text",
        "muted",
        "border",
        "accent",
        "navBg",
        "navText",
        "buttonText",
      ];
    }
    return [...BASIC_THEME_COLOR_KEYS];
  }

  async maxImagesPerProduct(storeId: string): Promise<number> {
    const sub = await this.getSubscription(storeId);
    return getPlan(sub.planId).limits.maxImagesPerProduct;
  }

  async maxNavActions(storeId: string): Promise<number> {
    const sub = await this.getSubscription(storeId);
    return getPlan(sub.planId).limits.maxNavActions;
  }

  async getLimits(storeId: string) {
    const sub = await this.getSubscription(storeId);
    return getPlan(sub.planId).limits;
  }

  effectivePlanId(sub: Subscription): PlanId {
    return sub.planId;
  }
}
