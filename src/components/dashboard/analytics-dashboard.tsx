"use client";

import type { DashboardStats } from "@/application/services/analytics-service";
import { SafeImage } from "@/components/ui/safe-image";
import { getDashboardStatsAction } from "@/features/dashboard/stats-actions";
import { DASHBOARD_STATS_POLL_MS } from "@/lib/dashboard-cache";
import { formatMoney } from "@/lib/social/sharing";
import { cn } from "@/lib/utils/cn";
import {
  Eye,
  Globe2,
  Lock,
  MessageCircle,
  RefreshCw,
  Share2,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Labels = {
  galleryVisits: string;
  productViews: string;
  whatsappClicks: string;
  engagementRate: string;
  topViewed: string;
  visitsByDay: string;
  viewsCount: string;
  empty: string;
  upgradeCta: string;
  upgradeHint: string;
  locations: string;
  peakHours: string;
  topShared: string;
  interest: string;
  refreshData: string;
  today: string;
  range7: string;
  range30: string;
  range90: string;
  sharesUnit: string;
  noLocations: string;
};

type Tint = "peach" | "sky" | "lilac" | "mint" | "sand";

const EDGE: Record<Tint, { edge: string; ink: string }> = {
  peach: { edge: "rgba(251,146,60,0.14)", ink: "#9a3412" },
  sky: { edge: "rgba(56,189,248,0.14)", ink: "#0369a1" },
  lilac: { edge: "rgba(167,139,250,0.14)", ink: "#6d28d9" },
  mint: { edge: "rgba(52,211,153,0.14)", ink: "#047857" },
  sand: { edge: "rgba(251,191,36,0.15)", ink: "#92400e" },
};

function formatNum(n: number): string {
  return new Intl.NumberFormat("ar").format(n);
}

function SoftCard({
  children,
  className,
  tint = "sand",
}: {
  children: ReactNode;
  className?: string;
  tint?: Tint;
}) {
  const { edge } = EDGE[tint];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] border border-slate-200/55 bg-white",
        "shadow-[0_12px_32px_-24px_rgba(15,23,42,0.24)]",
        className,
      )}
      style={{
        backgroundImage: `
          radial-gradient(120% 80% at 0% 0%, ${edge}, transparent 42%),
          radial-gradient(110% 75% at 100% 0%, ${edge}, transparent 40%),
          radial-gradient(100% 90% at 100% 100%, ${edge}, transparent 45%),
          radial-gradient(90% 80% at 0% 100%, ${edge}, transparent 42%),
          linear-gradient(180deg, #ffffff, #ffffff)
        `,
      }}
    >
      {children}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label ? (
        <p className="mb-1.5 font-semibold text-slate-700">{label}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li
            key={String(p.name)}
            className="flex items-center gap-2 text-slate-600"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
            <span>{p.name}</span>
            <span className="ms-auto font-semibold tabular-nums text-slate-900">
              {formatNum(Number(p.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  tint,
  icon: Icon,
  chart,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tint: Tint;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  chart?: ReactNode;
}) {
  const { ink } = EDGE[tint];
  return (
    <SoftCard tint={tint} className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500 sm:text-xs">
            {label}
          </p>
          <p
            className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-[1.75rem]"
            style={{ color: ink }}
          >
            {value}
          </p>
          {hint ? <div className="mt-2">{hint}</div> : null}
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100/80"
          style={{ color: ink }}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
      {chart ? <div className="mt-3 h-[72px]">{chart}</div> : null}
    </SoftCard>
  );
}

function SparkArea({
  data,
  dataKey,
  color,
  name,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color: string;
  name: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2}
          fill={`url(#fill-${dataKey})`}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SparkBars({
  data,
  dataKey,
  color,
  name,
}: {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color: string;
  name: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 2, left: 0, bottom: 0 }}>
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "rgba(15,23,42,0.04)" }}
        />
        <Bar
          dataKey={dataKey}
          name={name}
          fill={color}
          radius={[4, 4, 0, 0]}
          activeBar={{ fill: color, opacity: 0.85 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Adjust lock blur strength here (px). Higher = stronger blur. */
const LOCK_BLUR_PX = 6;
/** Frost overlay opacity 0–1. Higher = more white cover over the data. */
const LOCK_OVERLAY_OPACITY = 0.28;

/** Full-page blur over all analytics content for non‑Pro (including top tiles). */
function FullPageLock({
  locked,
  hint,
  cta,
  children,
}: {
  locked: boolean;
  hint: string;
  cta: string;
  children: ReactNode;
}) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className="pointer-events-none select-none"
        aria-hidden
        style={{ filter: `blur(${LOCK_BLUR_PX}px)` }}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: `rgba(255,255,255,${LOCK_OVERLAY_OPACITY})` }}
      />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-600 shadow-lg ring-1 ring-amber-200">
          <Lock className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <p className="max-w-md text-sm font-semibold leading-relaxed text-slate-800">
          {hint}
        </p>
        <Link
          href="/dashboard/subscription"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-orange-500 to-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(249,115,22,0.7)]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          {cta}
        </Link>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-[1.5rem] bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-[1.5rem] bg-slate-100" />
      <div className="h-48 rounded-[1.5rem] bg-slate-100" />
    </div>
  );
}

export function AnalyticsDashboard({
  storeId,
  storeSlug,
  rangeDays,
  initial,
  labels,
}: {
  storeId: string;
  storeSlug: string;
  rangeDays: 1 | 7 | 30 | 90;
  initial: DashboardStats;
  labels: Labels;
}) {
  const [stats, setStats] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setStats(initial);
  }, [initial]);

  const refresh = useCallback(async () => {
    if (!initial.isPro) return;
    setRefreshing(true);
    try {
      const result = await getDashboardStatsAction(storeId, rangeDays, true);
      if (result.ok) setStats(result.stats);
    } finally {
      window.setTimeout(() => setRefreshing(false), 280);
    }
  }, [initial.isPro, storeId, rangeDays]);

  useEffect(() => {
    if (!initial.isPro) return;
    let cancelled = false;
    const id = window.setInterval(() => {
      void getDashboardStatsAction(storeId, rangeDays, true).then((result) => {
        if (!cancelled && result.ok) setStats(result.stats);
      });
    }, DASHBOARD_STATS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial.isPro, storeId, rangeDays]);

  const daySeries = useMemo(
    () =>
      stats.visitsByDay.map((d) => ({
        label: d.label,
        visits: d.visits,
        productViews: d.productViews,
        whatsappClicks: d.whatsappClicks,
        engagement:
          d.productViews === 0
            ? 0
            : Math.round((d.whatsappClicks / d.productViews) * 1000) / 10,
      })),
    [stats.visitsByDay],
  );

  const peakSeries = useMemo(
    () =>
      stats.pro.peakHours.map((h) => ({
        label: `${h.hour}:00`,
        count: h.count,
      })),
    [stats.pro.peakHours],
  );

  const locked = !initial.isPro;
  const shared =
    stats.pro.topShared.length > 0
      ? stats.pro.topShared
      : [
          {
            productId: "demo",
            name: "منتج تجريبي",
            count: 4,
            imageUrl: null as string | null,
            price: 24,
            currency: "USD",
            slug: "demo",
          },
        ];

  return (
    <FullPageLock
      locked={locked}
      hint={labels.upgradeHint}
      cta={labels.upgradeCta}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3" dir="ltr">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { days: 1 as const, label: labels.today },
                { days: 7 as const, label: labels.range7 },
                { days: 30 as const, label: labels.range30 },
                { days: 90 as const, label: labels.range90 },
              ] as const
            ).map(({ days, label }) => {
              const active = rangeDays === days;
              return (
                <Link
                  key={days}
                  href={`/dashboard/analytics?range=${days}`}
                  tabIndex={locked ? -1 : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-[0_10px_24px_-10px_rgba(249,115,22,0.75)]"
                      : "bg-slate-50 text-slate-500 ring-1 ring-slate-200/70 hover:text-slate-800",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={locked || refreshing}
            tabIndex={locked ? -1 : undefined}
            className={cn(
              "ms-auto inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition",
              "hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700",
              "disabled:cursor-wait disabled:opacity-70",
            )}
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
              strokeWidth={2}
            />
            {labels.refreshData}
          </button>
        </div>

        {refreshing ? (
          <AnalyticsSkeleton />
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <MetricTile
                label={labels.galleryVisits}
                value={formatNum(stats.storeViews)}
                tint="peach"
                icon={Store}
                hint={
                  <span className="text-[11px] text-slate-500">
                    زوار فريدون فقط
                  </span>
                }
                chart={
                  <SparkArea
                    data={daySeries}
                    dataKey="visits"
                    color="#ea580c"
                    name={labels.galleryVisits}
                  />
                }
              />
              <MetricTile
                label={labels.productViews}
                value={formatNum(stats.productViews)}
                tint="lilac"
                icon={Eye}
                chart={
                  <SparkArea
                    data={daySeries}
                    dataKey="productViews"
                    color="#7c3aed"
                    name={labels.productViews}
                  />
                }
              />
              <MetricTile
                label={labels.whatsappClicks}
                value={formatNum(stats.whatsappClicks)}
                tint="mint"
                icon={MessageCircle}
                chart={
                  <SparkBars
                    data={daySeries}
                    dataKey="whatsappClicks"
                    color="#059669"
                    name={labels.whatsappClicks}
                  />
                }
              />
              <MetricTile
                label={labels.engagementRate}
                value={`${formatNum(stats.engagementRate)}%`}
                tint="sand"
                icon={TrendingUp}
                hint={
                  <span className="text-[11px] text-slate-500">
                    {labels.interest}
                  </span>
                }
                chart={
                  <SparkArea
                    data={daySeries}
                    dataKey="engagement"
                    color="#d97706"
                    name={labels.engagementRate}
                  />
                }
              />
            </section>

            <SoftCard tint="sand" className="p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-800">
                  {labels.visitsByDay}
                </h2>
                <span className="text-[11px] text-slate-400">
                  {labels.galleryVisits} · {labels.whatsappClicks}
                </span>
              </div>
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={daySeries}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="visits"
                      name={labels.galleryVisits}
                      stroke="#ea580c"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="whatsappClicks"
                      name={labels.whatsappClicks}
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SoftCard>

            <SoftCard tint="lilac" className="p-5 sm:p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">
                {labels.topViewed}
              </h2>
              {stats.topProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  {labels.empty}
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.topProducts.map((p, index) => (
                    <li
                      key={p.productId}
                      className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-3 ring-1 ring-slate-100"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-700">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatNum(p.views)} {labels.viewsCount}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SoftCard>

            <section className="grid gap-4 lg:grid-cols-2">
              <SoftCard tint="sky" className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-sky-600" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    {labels.locations}
                  </h3>
                </div>
                {stats.pro.locations.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    {labels.noLocations}
                  </p>
                ) : (
                  <ul className="mb-4 space-y-2">
                    {stats.pro.locations.map((loc) => (
                      <li
                        key={loc.label}
                        className="flex justify-between text-sm text-slate-700"
                      >
                        <span>{loc.label}</span>
                        <span className="tabular-nums text-slate-500">
                          {formatNum(loc.count)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mb-2 text-[11px] font-medium text-slate-500">
                  {labels.peakHours}
                </p>
                <div className="h-28" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakSeries}>
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="count"
                        name={labels.peakHours}
                        fill="#0284c7"
                        radius={[4, 4, 0, 0]}
                        activeBar={{ fill: "#0369a1" }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SoftCard>

              <SoftCard tint="lilac" className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-slate-800">
                    {labels.topShared}
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {shared.map((p) => (
                    <Link
                      key={p.productId}
                      href={
                        p.slug === "demo"
                          ? "#"
                          : `/${storeSlug}/products/${p.slug}`
                      }
                      target="_blank"
                      tabIndex={locked ? -1 : undefined}
                      className="group overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative aspect-4/3 bg-slate-50">
                        {p.imageUrl ? (
                          <SafeImage
                            src={p.imageUrl}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            {p.name.slice(0, 1)}
                          </div>
                        )}
                        <span className="absolute start-2 top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {formatNum(p.count)} {labels.sharesUnit}
                        </span>
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-violet-700">
                          {p.name}
                        </p>
                        <p className="text-xs tabular-nums text-slate-500">
                          {formatMoney(p.price, p.currency as "USD", "ar")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </SoftCard>
            </section>
          </div>
        )}
      </div>
    </FullPageLock>
  );
}
