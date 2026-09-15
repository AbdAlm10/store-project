"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";
import type { DashboardStats } from "@/application/services/analytics-service";

export async function getDashboardStatsAction(
  storeId: string,
  rangeDays: 1 | 7 | 30 | 90 = 7,
  includeTopProducts = true,
): Promise<
  { ok: true; stats: DashboardStats } | { ok: false; error: string }
> {
  try {
    const stats = await getServices().analytics.getDashboardStats(
      storeId,
      rangeDays,
      { includeTopProducts },
    );
    return { ok: true, stats };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
