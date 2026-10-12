"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";
import type { DashboardStats } from "@/application/services/analytics-service";

const ANALYTICS_RANGES = [1, 7, 30, 90] as const;

export async function getDashboardStatsAction(
  storeId: string,
  rangeDays: 1 | 7 | 30 | 90 = 7,
  includeTopProducts = true,
): Promise<
  { ok: true; stats: DashboardStats } | { ok: false; error: string }
> {
  try {
    const range = Number(rangeDays);
    if (!ANALYTICS_RANGES.includes(range as (typeof ANALYTICS_RANGES)[number])) {
      return { ok: false, error: "نطاق التحليلات غير صالح." };
    }
    const stats = await getServices().analytics.getDashboardStats(
      storeId,
      range as 1 | 7 | 30 | 90,
      { includeTopProducts },
    );
    return { ok: true, stats };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
