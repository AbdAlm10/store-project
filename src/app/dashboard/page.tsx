import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { CopyStoreUrl } from "@/features/dashboard/copy-store-url";
import { getServices } from "@/infrastructure/container";
import { storeUrl } from "@/lib/social/sharing";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  QuickAction,
  StatusBadge,
} from "@/components/dashboard/page-header";
import { computeStoreHealth } from "@/domain/rules/store-health";
import { EmptyState } from "@/components/ui/feedback";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardHomePage() {
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");

  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const store = stores[0];
  const [products, categories, stats] = await Promise.all([
    services.products.listForMerchant(store.id, { pageSize: 5 }),
    services.categories.listForMerchant(store.id),
    services.analytics.getDashboardStats(store.id, 7),
  ]);

  const health = computeStoreHealth({
    store,
    productCount: products.total,
    categoryCount: categories.length,
  });

  const cards = [
    { label: t("productsCount"), value: products.total },
    { label: t("storeViews7d"), value: stats.storeViews },
    { label: t("productViews7d"), value: stats.productViews },
    { label: t("whatsappClicks7d"), value: stats.whatsappClicks },
  ];

  const isNew = products.total === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={store.name}
        description={t("dashboardDesc")}
        actions={
          <>
            <Link href={`/${store.slug}`} target="_blank">
              <Button variant="outline">{t("viewStore")}</Button>
            </Link>
            <Link href="/dashboard/products/new">
              <Button>{t("addProduct")}</Button>
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={store.status} />
        <span className="text-sm text-slate-500">/{store.slug}</span>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">{t("shareStore")}</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <code className="break-all text-sm font-medium text-slate-900">
            {storeUrl(store.slug)}
          </code>
          <div className="flex flex-wrap gap-2">
            <CopyStoreUrl url={storeUrl(store.slug)} />
            <Link href={`/${store.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                {t("open")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {isNew ? (
        <EmptyState
          title={t("yourStoreIsNew")}
          description={t("yourStoreIsNewHint")}
          action={
            <Link href="/dashboard/products/new">
              <Button>{t("addFirstProduct")}</Button>
            </Link>
          }
        />
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-slate-900">
          {t("quickActions")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/dashboard/products/new"
            label={t("qaAddProduct")}
            description={t("qaAddProductDesc")}
          />
          <QuickAction
            href="/dashboard/store"
            label={t("qaEditStore")}
            description={t("qaEditStoreDesc")}
          />
          <QuickAction
            href="/dashboard/store-design"
            label={t("qaCustomize")}
            description={t("qaCustomizeDesc")}
          />
          <QuickAction
            href="/dashboard/categories"
            label={t("qaCategories")}
            description={t("qaCategoriesDesc")}
          />
          <QuickAction
            href="/dashboard/analytics"
            label={t("qaAnalytics")}
            description={t("qaAnalyticsDesc")}
          />
          <QuickAction
            href={`/${store.slug}`}
            label={t("qaPreview")}
            description={t("qaPreviewDesc")}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t("storeSetup")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("healthComplete", {
                completed: health.completed,
                total: health.total,
              })}
            </p>
          </div>
          <p className="font-[family-name:var(--font-display)] text-2xl text-slate-900">
            {health.percent}%
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-600 transition-all"
            style={{ width: `${health.percent}%` }}
          />
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {health.items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                {item.done ? (
                  <Check className="h-4 w-4 text-teal-600" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300" aria-hidden />
                )}
                <span className={item.done ? "text-slate-500" : "font-medium"}>
                  {t(item.labelKey)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {t("recentProducts")}
          </h2>
          <Link
            href="/dashboard/products"
            className="text-sm font-medium text-teal-700"
          >
            {t("viewAll")}
          </Link>
        </div>
        {products.items.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={t("emptyProducts")}
              description={t("emptyProductsHint")}
              action={
                <Link href="/dashboard/products/new">
                  <Button>{t("addProduct")}</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {products.items.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {product.name}
                </Link>
                <StatusBadge status={product.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
