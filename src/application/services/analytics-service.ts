import type {
  AnalyticsRepository,
  ProductRepository,
  StoreMemberRepository,
  StoreRepository,
} from "@/application/ports/repositories";
import { AppError } from "@/domain/errors";
import { assertCanManageStore } from "@/domain/rules/store-rules";
import { analyticsTrackSchema } from "@/validations/schemas";
import type { AuthService } from "./auth-service";
import type { EntitlementService } from "./entitlement-service";

export type NamedCount = {
  productId: string;
  name: string;
  count: number;
};

export type SharedProductCard = {
  productId: string;
  name: string;
  count: number;
  imageUrl: string | null;
  price: number;
  currency: string;
  slug: string;
};

export type DayBucket = {
  date: string;
  label: string;
  visits: number;
  productViews: number;
  whatsappClicks: number;
};

export type DeviceStat = {
  label: string;
  value: number;
  percent: number;
};

export type DashboardStats = {
  /** Unique gallery visitors (distinct visitorKey on store_view). */
  storeViews: number;
  productViews: number;
  whatsappClicks: number;
  shares: number;
  /** Alias kept for older UI; same as storeViews. */
  uniqueVisitors: number;
  /** WhatsApp clicks / product views * 100 (falls back to unique visits). */
  engagementRate: number;
  topProducts: Array<{ productId: string; views: number; name: string }>;
  topWhatsappProducts: NamedCount[];
  zeroViewProducts: Array<{ productId: string; name: string }>;
  visitsByDay: DayBucket[];
  devices: DeviceStat[];
  isPro: boolean;
  pro: {
    locations: Array<{ label: string; count: number }>;
    peakHours: Array<{ hour: number; count: number }>;
    topShared: SharedProductCard[];
  };
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function dayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("ar", { weekday: "short", day: "numeric" });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Static preview stats for non‑Pro — no analytics DB reads. */
export function buildDemoDashboardStats(
  rangeDays: 1 | 7 | 30 | 90,
): DashboardStats {
  const scale = rangeDays === 1 ? 1 : rangeDays === 7 ? 4 : rangeDays === 30 ? 12 : 28;
  const dayCount = Math.min(rangeDays, rangeDays <= 30 ? rangeDays : 12);

  const visitsByDay: DayBucket[] = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const offset =
      rangeDays <= 30 ? dayCount - 1 - i : Math.round(((dayCount - 1 - i) * rangeDays) / dayCount);
    d.setDate(d.getDate() - offset);
    const date = d.toISOString().slice(0, 10);
    const wave = 0.55 + 0.45 * Math.sin(i * 0.9);
    return {
      date,
      label: dayLabel(date),
      visits: Math.round((18 + i * 2) * wave * (scale / Math.max(dayCount, 1))),
      productViews: Math.round((42 + i * 3) * wave * (scale / Math.max(dayCount, 1))),
      whatsappClicks: Math.round((7 + i) * wave * (scale / Math.max(dayCount, 1))),
    };
  });

  const storeViews = visitsByDay.reduce((s, d) => s + d.visits, 0);
  const productViews = visitsByDay.reduce((s, d) => s + d.productViews, 0);
  const whatsappClicks = visitsByDay.reduce((s, d) => s + d.whatsappClicks, 0);
  const shares = Math.round(whatsappClicks * 0.35);

  return {
    storeViews,
    productViews,
    whatsappClicks,
    shares,
    uniqueVisitors: storeViews,
    engagementRate:
      productViews === 0 ? 0 : round1((whatsappClicks / productViews) * 100),
    topProducts: [
      { productId: "demo-1", views: Math.round(productViews * 0.28), name: "منتج مميز" },
      { productId: "demo-2", views: Math.round(productViews * 0.19), name: "عرض الأسبوع" },
      { productId: "demo-3", views: Math.round(productViews * 0.14), name: "الأكثر طلباً" },
    ],
    topWhatsappProducts: [],
    zeroViewProducts: [],
    visitsByDay,
    devices: [],
    isPro: false,
    pro: {
      locations: [
        { label: "الرياض", count: Math.round(storeViews * 0.34) },
        { label: "جدة", count: Math.round(storeViews * 0.22) },
        { label: "الدمام", count: Math.round(storeViews * 0.15) },
      ],
      peakHours: [10, 11, 14, 16, 20, 21].map((hour, i) => ({
        hour,
        count: 12 + i * 5 + (hour % 3) * 4,
      })),
      topShared: [
        {
          productId: "demo",
          name: "منتج تجريبي",
          count: 4 + Math.round(scale / 4),
          imageUrl: null,
          price: 24,
          currency: "USD",
          slug: "demo",
        },
      ],
    },
  };
}

export class AnalyticsService {
  constructor(
    private readonly auth: AuthService,
    private readonly stores: StoreRepository,
    private readonly members: StoreMemberRepository,
    private readonly analytics: AnalyticsRepository,
    private readonly entitlements: EntitlementService,
    private readonly products: ProductRepository,
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

    const isPro = await this.entitlements.canUseAdvancedAnalytics(storeId);
    // Non‑Pro: serve static demo stats — skip analytics/events DB load.
    if (!isPro) {
      return buildDemoDashboardStats(rangeDays);
    }

    const since = new Date();
    since.setDate(since.getDate() - rangeDays);
    const sinceIso = since.toISOString();

    const [events, productPage] = await Promise.all([
      this.analytics.listRecent(storeId, sinceIso, 5_000),
      this.products.list({ storeId, pageSize: 200 }),
    ]);

    const productById = new Map(productPage.items.map((p) => [p.id, p] as const));
    const productName = (id: string) =>
      productById.get(id)?.name ?? `${id.slice(0, 8)}…`;

    const uniqueStoreVisitors = new Set<string>();
    const uniqueVisitorsByDay = new Map<string, Set<string>>();
    let productViews = 0;
    let whatsappClicks = 0;
    let shares = 0;
    const viewsByProduct = new Map<string, number>();
    const sharesByProduct = new Map<string, number>();
    const hourCounts = new Map<number, number>();
    const dayMap = new Map<
      string,
      { visits: number; productViews: number; whatsappClicks: number }
    >();

    for (let i = rangeDays - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { visits: 0, productViews: 0, whatsappClicks: 0 });
      uniqueVisitorsByDay.set(key, new Set());
    }

    const locationCounts = new Map<string, number>();
    const locationVisitors = new Map<string, Set<string>>();

    for (const event of events) {
      const key = dayKey(event.createdAt);
      const bucket = dayMap.get(key) ?? {
        visits: 0,
        productViews: 0,
        whatsappClicks: 0,
      };
      if (!dayMap.has(key)) dayMap.set(key, bucket);

      const hour = new Date(event.createdAt).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

      const cityRaw = (() => {
        const direct =
          typeof event.metadata?.city === "string"
            ? event.metadata.city.trim()
            : "";
        if (direct) return direct;
        const loc =
          typeof event.metadata?.location === "string"
            ? event.metadata.location.trim()
            : "";
        if (!loc) return "";
        if (loc.includes("·")) {
          return loc.split("·").pop()?.trim() ?? "";
        }
        return loc;
      })();
      const loc =
        cityRaw &&
        cityRaw !== "تطوير" &&
        cityRaw !== "محلي" &&
        cityRaw !== "—"
          ? cityRaw
          : "";
      if (loc) {
        if (event.visitorKey) {
          const set = locationVisitors.get(loc) ?? new Set();
          set.add(event.visitorKey);
          locationVisitors.set(loc, set);
        } else {
          locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);
        }
      }

      switch (event.eventType) {
        case "store_view": {
          if (event.visitorKey) {
            uniqueStoreVisitors.add(event.visitorKey);
            const daySet = uniqueVisitorsByDay.get(key) ?? new Set();
            daySet.add(event.visitorKey);
            uniqueVisitorsByDay.set(key, daySet);
          }
          break;
        }
        case "product_view":
          productViews += 1;
          bucket.productViews += 1;
          if (event.productId) {
            viewsByProduct.set(
              event.productId,
              (viewsByProduct.get(event.productId) ?? 0) + 1,
            );
          }
          break;
        case "whatsapp_click":
          whatsappClicks += 1;
          bucket.whatsappClicks += 1;
          break;
        case "share":
          shares += 1;
          if (event.productId) {
            sharesByProduct.set(
              event.productId,
              (sharesByProduct.get(event.productId) ?? 0) + 1,
            );
          }
          break;
        default:
          break;
      }
    }

    // Fill unique visit counts into day buckets
    for (const [date, set] of uniqueVisitorsByDay) {
      const bucket = dayMap.get(date);
      if (bucket) bucket.visits = set.size;
    }

    const storeViews = uniqueStoreVisitors.size;
    const engagementBase = productViews > 0 ? productViews : storeViews;
    const engagementRate =
      engagementBase === 0
        ? 0
        : round1((whatsappClicks / engagementBase) * 100);

    const topLimit = isPro ? 8 : 5;
    const topProducts = [...viewsByProduct.entries()]
      .map(([productId, views]) => ({
        productId,
        views,
        name: productName(productId),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, includeTopProducts ? topLimit : 0);

    const visitsByDay: DayBucket[] = (() => {
      const entries = [...dayMap.entries()].sort(([a], [b]) =>
        a < b ? -1 : 1,
      );
      if (rangeDays <= 30) {
        return entries.map(([date, v]) => ({
          date,
          label: dayLabel(date),
          visits: v.visits,
          productViews: v.productViews,
          whatsappClicks: v.whatsappClicks,
        }));
      }
      const bucketSize = Math.ceil(entries.length / 12);
      const collapsed: DayBucket[] = [];
      for (let i = 0; i < entries.length; i += bucketSize) {
        const slice = entries.slice(i, i + bucketSize);
        const first = slice[0]![0];
        collapsed.push({
          date: first,
          label: dayLabel(first),
          visits: slice.reduce((s, [, v]) => s + v.visits, 0),
          productViews: slice.reduce((s, [, v]) => s + v.productViews, 0),
          whatsappClicks: slice.reduce((s, [, v]) => s + v.whatsappClicks, 0),
        });
      }
      return collapsed;
    })();

    const devices: DeviceStat[] = [];

    const peakHours = [...hourCounts.entries()]
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    const topShared: SharedProductCard[] = [...sharesByProduct.entries()]
      .map(([productId, count]) => {
        const product = productById.get(productId);
        return {
          productId,
          count,
          name: product?.name ?? productName(productId),
          imageUrl: product?.images[0]?.url ?? null,
          price: product?.price ?? 0,
          currency: product?.currency ?? "USD",
          slug: product?.slug ?? productId,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const locationsFromVisitors = [...locationVisitors.entries()].map(
      ([label, set]) => ({ label, count: set.size }),
    );
    const locationsFromCounts = [...locationCounts.entries()].map(
      ([label, count]) => ({ label, count }),
    );
    const locationMerged = new Map<string, number>();
    for (const row of [...locationsFromVisitors, ...locationsFromCounts]) {
      locationMerged.set(
        row.label,
        Math.max(locationMerged.get(row.label) ?? 0, row.count),
      );
    }
    const locations = [...locationMerged.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      storeViews,
      productViews,
      whatsappClicks,
      shares,
      uniqueVisitors: storeViews,
      engagementRate,
      topProducts,
      topWhatsappProducts: [],
      zeroViewProducts: [],
      visitsByDay,
      devices,
      isPro: true,
      pro: {
        locations,
        peakHours,
        topShared,
      },
    };
  }
}
