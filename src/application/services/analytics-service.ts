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

  async getDashboardStats(
    storeId: string,
    rangeDays: 1 | 7 | 30 | 90,
  ): Promise<DashboardStats> {
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "staff");

    const since = new Date();
    since.setDate(since.getDate() - rangeDays);
    const sinceIso = since.toISOString();

    const [storeViews, productViews, whatsappClicks, shares, topProducts] =
      await Promise.all([
        this.analytics.countEvents(storeId, "store_view", sinceIso),
        this.analytics.countEvents(storeId, "product_view", sinceIso),
        this.analytics.countEvents(storeId, "whatsapp_click", sinceIso),
        this.analytics.countEvents(storeId, "share", sinceIso),
        this.analytics.topProducts(storeId, sinceIso, 5),
      ]);

    const advanced = await this.entitlements.canUseAdvancedAnalytics(storeId);

    return {
      storeViews,
      productViews,
      whatsappClicks,
      shares,
      topProducts: advanced ? topProducts : topProducts.slice(0, 3),
    };
  }
}
