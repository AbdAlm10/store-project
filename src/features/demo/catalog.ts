import type { DashboardStats } from "@/application/services/analytics-service";
import { limitsForSubscription } from "@/domain/plans/access";
import type { ProductWithMedia } from "@/domain/types/entities";
import { demoSeed } from "@/infrastructure/demo/seed";

export const DEMO_STORE_PATH = "/alnoor";
export const DEMO_DASHBOARD_BASE = "/demo/dashboard";

const store = demoSeed.stores[0];
const profile = demoSeed.profiles[0];
const subscription = demoSeed.subscriptions[0];

if (!store || !profile || !subscription) {
  throw new Error("Demo seed is missing the alnoor store.");
}

export const demoStore = store;
export const demoProfile = profile;
export const demoSubscription = subscription;
export const demoLimits = limitsForSubscription(subscription);

const categoriesById = new Map(demoSeed.categories.map((category) => [category.id, category]));

export function demoProducts(): ProductWithMedia[] {
  return demoSeed.products.map((product) => ({
    ...product,
    images: demoSeed.images.filter((image) => image.productId === product.id),
    variants: demoSeed.variants.filter((variant) => variant.productId === product.id),
    category: product.categoryId ? categoriesById.get(product.categoryId) ?? null : null,
  }));
}

export const demoCategories = demoSeed.categories;

const ORDER_STATUS = ["جديد", "قيد التجهيز", "مكتمل"] as const;

export type DemoOrder = {
  number: string;
  productName: string;
  quantity: number;
  total: number;
  currency: string;
  status: (typeof ORDER_STATUS)[number];
};

/** Sample orders whose lines and totals come from the seed catalog. */
export function demoOrders(): DemoOrder[] {
  return demoSeed.products.slice(0, 6).map((product, index) => {
    const quantity = (index % 3) + 1;
    return {
      number: `D-${1001 + index}`,
      productName: product.name,
      quantity,
      total: product.price * quantity,
      currency: product.currency,
      status: ORDER_STATUS[index % ORDER_STATUS.length] ?? "جديد",
    };
  });
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
 * Dashboard analytics counted from `demoSeed.events` and seed product names.
 * No analytics service and no database.
 */
export function demoDashboardStats(
  rangeDays: 1 | 7 | 30 | 90,
  now = Date.now(),
): DashboardStats {
  const since = now - rangeDays * 86_400_000;
  const events = demoSeed.events.filter((event) => Date.parse(event.createdAt) >= since);
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
