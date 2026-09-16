import { analyticsTrackSchema } from "@/validations/schemas";
import type { AnalyticsRepository } from "@/application/ports/repositories";
import type { AuthService } from "./auth-service";
import type { EntitlementService } from "./entitlement-service";
import { AppError } from "@/domain/errors";
import type {
  StoreMemberRepository,
  StoreRepository,
} from "@/application/ports/repositories";
import { assertCanManageStore } from "@/domain/rules/store-rules";

export type DashboardStats = {
  storeViews: number;
  productViews: number;
  whatsappClicks: number;
  shares: number;
  topProducts: Array<{ productId: string; views: number }>;
};

export class AnalyticsService {
  constructor(
    private readonly auth: AuthService,
    private readonly stores: StoreRepository,
    private readonly members: StoreMemberRepository,
    private readonly analytics: AnalyticsRepository,
    private readonly entitlements: EntitlementService,
  ) {}

  async track(input: unknown): Promise<void> {
    const data = analyticsTrackSchema.parse(input);
    await this.analytics.track({
      storeId: data.storeId,
      productId: data.productId ?? null,
      eventType: data.eventType,
      source: data.source ?? null,
      path: data.path ?? null,
      visitorKey: data.visitorKey ?? null,
      metadata: data.metadata ?? {},
    });
  }

  /** Public popularity signal for storefront recommendations (no auth). */
  async getPublicProductPopularity(
    storeId: string,
    days = 30,
    limit = 40,
  ): Promise<Array<{ productId: string; views: number }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.analytics.topProducts(storeId, since.toISOString(), limit);
  }

  async getDashboardStats(
    storeId: string,
    rangeDays: 1 | 7 | 30 | 90,
    options?: { includeTopProducts?: boolean },
  ): Promise<DashboardStats> {
    const includeTopProducts = options?.includeTopProducts ?? true;
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "staff");

    const since = new Date();
    since.setDate(since.getDate() - rangeDays);
    const sinceIso = since.toISOString();

    const [storeViews, productViews, whatsappClicks, shares, topProducts, advanced] =
      await Promise.all([
        this.analytics.countEvents(storeId, "store_view", sinceIso),
        this.analytics.countEvents(storeId, "product_view", sinceIso),
        this.analytics.countEvents(storeId, "whatsapp_click", sinceIso),
        this.analytics.countEvents(storeId, "share", sinceIso),
        includeTopProducts
          ? this.analytics.topProducts(storeId, sinceIso, 5)
          : Promise.resolve([] as Array<{ productId: string; views: number }>),
        includeTopProducts
          ? this.entitlements.canUseAdvancedAnalytics(storeId)
          : Promise.resolve(false),
      ]);

    return {
      storeViews,
      productViews,
      whatsappClicks,
      shares,
      topProducts: advanced ? topProducts : topProducts.slice(0, 3),
    };
  }
}
