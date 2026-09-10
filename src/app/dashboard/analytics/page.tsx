import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { PageHeader } from "@/components/dashboard/page-header";
import { PillLink } from "@/components/dashboard/ui";
import { LiveMetrics } from "@/components/dashboard/live-metrics";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "Analytics",
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
    <div className="space-y-6">
      <PageHeader
        title={t("analytics")}
        description={t("analyticsDesc", { store: store.name })}
        actions={
          <div className="flex flex-wrap gap-2">
            {[1, 7, 30, 90].map((days) => (
              <PillLink
                key={days}
                href={`/dashboard/analytics?range=${days}`}
                active={range === days}
              >
                {days === 1 ? t("today") : t("daysShort", { days })}
              </PillLink>
            ))}
          </div>
        }
      />

      <LiveMetrics
        storeId={store.id}
        rangeDays={range}
        initial={stats}
        cards={[
          { key: "storeViews", label: t("storeViews"), icon: "store" },
          { key: "productViews", label: t("productViews"), icon: "eye" },
          {
            key: "whatsappClicks",
            label: t("whatsappClicks"),
            icon: "message",
          },
          { key: "shares", label: t("shares"), icon: "share" },
        ]}
        showTopProducts
        topProductsTitle={t("topProducts")}
        viewsCountTemplate={t("viewsCount", { count: "__COUNT__" })}
        emptyLabel={t("noProductViews")}
      />
    </div>
  );
}
