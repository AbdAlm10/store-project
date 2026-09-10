/** Client router: keep dashboard tab payloads warm (seconds). */
export const DASHBOARD_CLIENT_STALE_SECONDS = 86_400; // 24h

/** Soft-refresh interval for volatile metrics (ms). */
export const DASHBOARD_STATS_POLL_MS = 10 * 60 * 1000; // 10 minutes

export function dashboardStoreTag(storeId: string) {
  return `dashboard:${storeId}`;
}

export function dashboardStatsTag(storeId: string) {
  return `dashboard:${storeId}:stats`;
}

export const DASHBOARD_PATHS = [
  "/dashboard",
  "/dashboard/products",
  "/dashboard/products/new",
  "/dashboard/categories",
  "/dashboard/store",
  "/dashboard/store-design",
  "/dashboard/analytics",
  "/dashboard/settings",
  "/dashboard/subscription",
] as const;

export const DASHBOARD_PREFETCH_HREFS = [
  "/dashboard",
  "/dashboard/products",
  "/dashboard/categories",
  "/dashboard/store",
  "/dashboard/store-design",
  "/dashboard/analytics",
  "/dashboard/settings",
  "/dashboard/subscription",
] as const;
