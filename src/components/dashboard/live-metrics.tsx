"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Eye,
  MessageCircle,
  Share2,
  Store,
} from "lucide-react";
import type { DashboardStats } from "@/application/services/analytics-service";
import { getDashboardStatsAction } from "@/features/dashboard/stats-actions";
import {
  DashboardCard,
  SectionTitle,
  SoftTrend,
  StatCard,
} from "@/components/dashboard/ui";
import { DASHBOARD_STATS_POLL_MS } from "@/lib/dashboard-cache";
import { cn } from "@/lib/utils/cn";

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
  topProductsTitle?: string;
  viewsCountTemplate?: string;
  emptyLabel?: string;
}) {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    setStats(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const result = await getDashboardStatsAction(storeId, rangeDays);
      if (!cancelled && result.ok) setStats(result.stats);
    }

    const id = window.setInterval(() => {
      void refresh();
    }, DASHBOARD_STATS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [storeId, rangeDays]);

  return (
    <>
      <section
        className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
      >
        {productsLabel != null && productsCount != null ? (
          <StatCard
            label={productsLabel}
            value={productsCount}
            icon={ICONS.boxes}
            hint={
              productsHint ? <SoftTrend>{productsHint}</SoftTrend> : undefined
            }
          />
        ) : null}
        {cards.map((card) => {
          const Icon = card.icon ? ICONS[card.icon] : undefined;
          return (
            <StatCard
              key={card.key}
              label={card.label}
              value={stats[card.key]}
              icon={Icon}
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
          <ul className="space-y-2 text-sm">
            {stats.topProducts.map((item) => (
              <li
                key={item.productId}
                className="flex items-center justify-between rounded-xl bg-slate-50/80 px-3 py-2.5"
              >
                <span className="font-mono text-xs text-slate-400">
                  {item.productId.slice(0, 8)}…
                </span>
                <span className="font-medium text-slate-800">
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
