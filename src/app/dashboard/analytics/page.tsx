import Link from "next/link";
import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { PageHeader } from "@/components/dashboard/page-header";
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

  const cards = [
    { label: t("storeViews"), value: stats.storeViews },
    { label: t("productViews"), value: stats.productViews },
    { label: t("whatsappClicks"), value: stats.whatsappClicks },
    { label: t("shares"), value: stats.shares },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("analytics")}
        description={t("analyticsDesc", { store: store.name })}
        actions={
          <div className="flex gap-2">
            {[1, 7, 30, 90].map((days) => (
              <Link
                key={days}
                href={`/dashboard/analytics?range=${days}`}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  range === days
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {days === 1 ? t("today") : t("daysShort", { days })}
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">
              {card.value}
            </p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="font-semibold text-slate-900">{t("topProducts")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {stats.topProducts.map((item) => (
            <li key={item.productId} className="flex justify-between">
              <span className="font-mono text-xs text-slate-500">
                {item.productId.slice(0, 8)}…
              </span>
              <span>{t("viewsCount", { count: item.views })}</span>
            </li>
          ))}
          {stats.topProducts.length === 0 ? (
            <li className="text-slate-500">{t("noProductViews")}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
