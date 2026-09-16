"use client";

import type { DashboardStats } from "@/application/services/analytics-service";
import {
  DashboardCard,
  SectionTitle,
  SoftTrend,
  StatCard,
  type StatTone,
} from "@/components/dashboard/ui";
import { getDashboardStatsAction } from "@/features/dashboard/stats-actions";
import { DASHBOARD_STATS_POLL_MS } from "@/lib/dashboard-cache";
import { cn } from "@/lib/utils/cn";
import {
  Boxes,
  Eye,
  MessageCircle,
  Share2,
  Store,
} from "lucide-react";
import { useEffect, useState } from "react";

const TONE_CYCLE: StatTone[] = ["mint", "sand", "mist", "sage"];

const ICONS = {
  boxes: Boxes,
  eye: Eye,
  share: Share2,
  message: MessageCircle,
  store: Store,
} as const;

export type MetricIconName = keyof typeof ICONS;

type MetricKey = keyof Pick<
  DashboardStats,
  "storeViews" | "productViews" | "whatsappClicks" | "shares"
>;

export type LiveMetricCard = {
  key: MetricKey;
  label: string;
  icon?: MetricIconName;
  /** Plain hint text (serialized-safe) */
  hint?: string;
};

/**
 * Soft-refreshes volatile dashboard metrics every 10 minutes without
 * reloading the page shell. Props must be plain JSON (no component functions).
 */
export function LiveMetrics({
  storeId,
  rangeDays = 7,
  initial,
  cards,
  productsCount,
  productsLabel,
  productsHint,
  className,
  showTopProducts = false,
  includeTopProducts,
  topProductsTitle,
  /** Template from server, e.g. t("viewsCount", { count: "__COUNT__" }) */
  viewsCountTemplate,
  emptyLabel,
}: {
  storeId: string;
  rangeDays?: 1 | 7 | 30 | 90;
  initial: DashboardStats;
  cards: LiveMetricCard[];
  productsCount?: number;
  productsLabel?: string;
  productsHint?: string;
  className?: string;
  showTopProducts?: boolean;
  /** Defaults to showTopProducts — home skips the heavy topProducts scan. */
  includeTopProducts?: boolean;
  topProductsTitle?: string;
  viewsCountTemplate?: string;
  emptyLabel?: string;
}) {
  const [stats, setStats] = useState(initial);
  const fetchTopProducts = includeTopProducts ?? showTopProducts;

  useEffect(() => {
    setStats(initial);
  }, [initial]);

  useEffect(() => {
    if (!initial.isPro) return;

    let cancelled = false;

    async function refresh() {
      const result = await getDashboardStatsAction(
        storeId,
        rangeDays,
        fetchTopProducts,
      );
      if (!cancelled && result.ok) setStats(result.stats);
    }

    const id = window.setInterval(() => {
      void refresh();
    }, DASHBOARD_STATS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial.isPro, storeId, rangeDays, fetchTopProducts]);

  return (
    <>
      <section
        className={cn("grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4", className)}
      >
        {productsLabel != null && productsCount != null ? (
          <StatCard
            label={productsLabel}
            value={productsCount}
            icon={ICONS.boxes}
            tone="mint"
            hint={
              productsHint ? <SoftTrend>{productsHint}</SoftTrend> : undefined
            }
          />
        ) : null}
        {cards.map((card, index) => {
          const Icon = card.icon ? ICONS[card.icon] : undefined;
          const toneOffset = productsLabel != null ? 1 : 0;
          return (
            <StatCard
              key={card.key}
              label={card.label}
              value={stats[card.key]}
              icon={Icon}
              tone={TONE_CYCLE[(index + toneOffset) % TONE_CYCLE.length]}
              hint={
                card.hint ? (
                  <SoftTrend>{card.hint}</SoftTrend>
                ) : (
                  <SoftTrend>10m</SoftTrend>
                )
              }
            />
          );
        })}
      </section>

      {showTopProducts ? (
        <DashboardCard className="mt-6">
          <SectionTitle title={topProductsTitle ?? ""} className="mb-3" />
          <ul className="divide-y divide-slate-100 text-sm">
            {stats.topProducts.map((item) => (
              <li
                key={item.productId}
                className="flex items-center justify-between px-1 py-3.5 first:pt-1 last:pb-1"
              >
                <span className="truncate text-sm text-slate-700">
                  {"name" in item && item.name
                    ? item.name
                    : `${item.productId.slice(0, 8)}…`}
                </span>
                <span className="shrink-0 font-medium text-slate-800">
                  {viewsCountTemplate
                    ? viewsCountTemplate.replace(
                        "__COUNT__",
                        String(item.views),
                      )
                    : item.views}
                </span>
              </li>
            ))}
            {stats.topProducts.length === 0 ? (
              <li className="py-6 text-center text-slate-400">{emptyLabel}</li>
            ) : null}
          </ul>
        </DashboardCard>
      ) : null}
    </>
  );
}
