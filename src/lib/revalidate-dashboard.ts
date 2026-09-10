import { revalidatePath, updateTag } from "next/cache";
import {
  DASHBOARD_PATHS,
  dashboardStatsTag,
  dashboardStoreTag,
} from "@/lib/dashboard-cache";

/**
 * After merchant mutations: drop server tags + path caches so the *next*
 * navigation (or explicit refresh) sees fresh catalog data — without forcing
 * a full reload on every tab click (client staleTimes still applies).
 *
 * Server-only — do not import from Client Components.
 */
export function revalidateDashboard(storeId?: string): void {
  if (storeId) {
    updateTag(dashboardStoreTag(storeId));
    updateTag(dashboardStatsTag(storeId));
  }
  revalidatePath("/dashboard", "layout");
  for (const path of DASHBOARD_PATHS) {
    revalidatePath(path);
  }
}
