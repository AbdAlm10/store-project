import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import { redirect } from "next/navigation";

export const metadata = {
  title: "التحليلات",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = ([1, 7, 30, 90].includes(Number(params.range))
    ? Number(params.range)
    : 7) as 1 | 7 | 30 | 90;

  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const stats = await services.analytics.getDashboardStats(store.id, range);

  return (
    <div className="space-y-6 bg-white">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-900 sm:text-[2rem]">
          {t("analytics")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
          {t("analyticsDesc", { store: store.name })}
        </p>
      </div>

      <AnalyticsDashboard
        storeId={store.id}
        storeSlug={store.slug}
        rangeDays={range}
        initial={stats}
        labels={{
          galleryVisits: t("galleryVisits"),
          productViews: t("productViews"),
          whatsappClicks: t("whatsappClicks"),
          engagementRate: t("engagementRate"),
          topViewed: t("topProducts"),
          visitsByDay: t("visitsByDay"),
          viewsCount: t("viewsUnit"),
          empty: t("noProductViews"),
          upgradeCta: t("analyticsUpgradeCta"),
          upgradeHint: t("analyticsUpgradeHint"),
          locations: t("locationsActivity"),
          peakHours: t("peakActivityHours"),
          topShared: t("topSharedProducts"),
          interest: t("productInterest"),
          refreshData: t("refreshAnalytics"),
          today: t("today"),
          range7: t("daysShort", { days: 7 }),
          range30: t("daysShort", { days: 30 }),
          range90: t("daysShort", { days: 90 }),
          sharesUnit: t("sharesUnit"),
          noLocations: t("noLocationsYet"),
        }}
      />
    </div>
  );
}
