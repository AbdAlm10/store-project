import {
  BASIC_THEME_COLOR_KEYS,
  getPlan,
  isUnlimited,
  type PlanId,
  type PlanLimits,
} from "@/config/plans";
import type { ThemeColorKey } from "@/config/themes";
import { AppError } from "@/domain/errors";
import type { Subscription } from "@/domain/types/entities";
import {
  effectivePlanId as resolveEffectivePlanId,
  limitsForSubscription,
} from "@/domain/plans/access";
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

  limitsOf(sub: Subscription): PlanLimits {
    return limitsForSubscription(sub);
  }

  async assertCanCreateProduct(
    storeId: string,
    currentProductCount: number,
  ): Promise<void> {
    const sub = await this.getSubscription(storeId);
    const plan = getPlan(resolveEffectivePlanId(sub));
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
    const plan = getPlan(resolveEffectivePlanId(sub));
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
    const plan = getPlan(resolveEffectivePlanId(sub));
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
    const plan = getPlan(resolveEffectivePlanId(sub));
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
    return this.limitsOf(sub).advancedAnalytics;
  }

  async analyticsLevel(storeId: string) {
    const sub = await this.getSubscription(storeId);
    return this.limitsOf(sub).analytics;
  }

  async canUseQr(storeId: string): Promise<boolean> {
    const sub = await this.getSubscription(storeId);
    return this.limitsOf(sub).qr;
  }

  async canUseCustomDomain(storeId: string): Promise<boolean> {
    const sub = await this.getSubscription(storeId);
    return this.limitsOf(sub).customDomain;
  }

  async canCustomizeAllThemeColors(storeId: string): Promise<boolean> {
    const sub = await this.getSubscription(storeId);
    return this.limitsOf(sub).themeAccess === "full";
  }

  async themeAccess(storeId: string) {
    const sub = await this.getSubscription(storeId);
    return this.limitsOf(sub).themeAccess;
  }

  async editableThemeColorKeys(storeId: string): Promise<ThemeColorKey[]> {
    const access = await this.themeAccess(storeId);
    if (access === "none") return [];
    if (access === "full") {
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
    return this.limitsOf(sub).maxImagesPerProduct;
  }

  async maxNavActions(storeId: string): Promise<number> {
    const sub = await this.getSubscription(storeId);
    return this.limitsOf(sub).maxNavActions;
  }

  async getLimits(storeId: string) {
    const sub = await this.getSubscription(storeId);
    return this.limitsOf(sub);
  }

  effectivePlanId(sub: Subscription): PlanId {
    return resolveEffectivePlanId(sub);
  }

  async simulateExpiredPlan(storeId: string, planId: PlanId): Promise<Subscription> {
    const sub = await this.getSubscription(storeId);
    const expiredAt = new Date(Date.now() - 60_000).toISOString();

    return this.subscriptions.update(sub.id, {
      planId,
      status: planId === "trial" ? "trialing" : "active",
      trialEndsAt: planId === "trial" ? expiredAt : null,
      currentPeriodEnd: expiredAt,
    });
  }

  async restoreSubscriptionForTest(
    storeId: string,
    endsAt: string,
  ): Promise<Subscription> {
    const sub = await this.getSubscription(storeId);
    const trial = sub.planId === "trial";
    return this.subscriptions.update(sub.id, {
      status: trial ? "trialing" : "active",
      trialEndsAt: trial ? endsAt : null,
      currentPeriodEnd: endsAt,
    });
  }
}
