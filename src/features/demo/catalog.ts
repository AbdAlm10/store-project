import type { DashboardStats } from "@/application/services/analytics-service";
import { limitsForSubscription } from "@/domain/plans/access";
import type { ProductWithMedia } from "@/domain/types/entities";
import {
  alnoorCategories,
  alnoorEvents,
  alnoorImages,
  alnoorOrders,
  alnoorProducts,
  alnoorProfile,
  alnoorStore,
  alnoorSubscription,
} from "@/features/demo/alnoor-demo";

export const DEMO_STORE_PATH = "/alnoor";
export const DEMO_DASHBOARD_BASE = "/demo/dashboard";

export const demoStore = alnoorStore;
export const demoProfile = alnoorProfile;
export const demoSubscription = alnoorSubscription;
export const demoLimits = limitsForSubscription(alnoorSubscription);

const categoriesById = new Map(alnoorCategories.map((category) => [category.id, category]));

export function demoProducts(): ProductWithMedia[] {
  return alnoorProducts.map((product) => ({
    ...product,
    images: alnoorImages.filter((image) => image.productId === product.id),
    variants: [],
    category: product.categoryId ? categoriesById.get(product.categoryId) ?? null : null,
  }));
}

export const demoCategories = alnoorCategories;

export type DemoOrder = (typeof alnoorOrders)[number];

/** Sample orders priced from the hardcoded النور catalog. */
export function demoOrders(): DemoOrder[] {
  return alnoorOrders;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function dayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString("ar", { weekday: "short", day: "numeric" });
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Dashboard analytics counted from the hardcoded النور visit rows.
 * No analytics service and no database.
 */
export function demoDashboardStats(
  rangeDays: 1 | 7 | 30 | 90,
  now = Date.now(),
): DashboardStats {
  const since = now - rangeDays * 86_400_000;
  const events = alnoorEvents.filter((event) => Date.parse(event.createdAt) >= since);
  const products = demoProducts();
  const productById = new Map(products.map((product) => [product.id, product]));

  const uniqueStoreVisitors = new Set<string>();
  const uniqueVisitorsByDay = new Map<string, Set<string>>();
  let productViews = 0;
  let whatsappClicks = 0;
  let shares = 0;
  const viewsByProduct = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  const dayMap = new Map<string, { visits: number; productViews: number; whatsappClicks: number }>();

  for (let index = rangeDays - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    dayMap.set(key, { visits: 0, productViews: 0, whatsappClicks: 0 });
    uniqueVisitorsByDay.set(key, new Set());
  }

  for (const event of events) {
    const key = dayKey(event.createdAt);
    const bucket = dayMap.get(key) ?? { visits: 0, productViews: 0, whatsappClicks: 0 };
    if (!dayMap.has(key)) dayMap.set(key, bucket);
    const hour = new Date(event.createdAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

    switch (event.eventType) {
      case "store_view":
        if (event.visitorKey) {
          uniqueStoreVisitors.add(event.visitorKey);
          const daySet = uniqueVisitorsByDay.get(key) ?? new Set();
          daySet.add(event.visitorKey);
          uniqueVisitorsByDay.set(key, daySet);
        }
        break;
      case "product_view":
        productViews += 1;
        bucket.productViews += 1;
        if (event.productId) {
          viewsByProduct.set(event.productId, (viewsByProduct.get(event.productId) ?? 0) + 1);
        }
        break;
      case "whatsapp_click":
        whatsappClicks += 1;
        bucket.whatsappClicks += 1;
        break;
      case "share":
        shares += 1;
        break;
      default:
        break;
    }
  }

  for (const [date, visitors] of uniqueVisitorsByDay) {
    const bucket = dayMap.get(date);
    if (bucket) bucket.visits = visitors.size;
  }

  const storeViews = uniqueStoreVisitors.size;
  const engagementBase = productViews > 0 ? productViews : storeViews;
  const topProducts = [...viewsByProduct.entries()]
    .map(([productId, views]) => ({
      productId,
      views,
      name: productById.get(productId)?.name ?? productId,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const visitsByDay = [...dayMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, value]) => ({
      date,
      label: dayLabel(date),
      visits: value.visits,
      productViews: value.productViews,
      whatsappClicks: value.whatsappClicks,
    }));

  return {
    storeViews,
    productViews,
    whatsappClicks,
    shares,
    uniqueVisitors: storeViews,
    engagementRate: engagementBase === 0 ? 0 : round1((whatsappClicks / engagementBase) * 100),
    topProducts,
    topWhatsappProducts: [],
    zeroViewProducts: [],
    visitsByDay,
    devices: [],
    isPro: true,
    analyticsLevel: "advanced",
    pro: {
      locations: [],
      peakHours: [...hourCounts.entries()]
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour),
      topShared: [],
    },
  };
}
