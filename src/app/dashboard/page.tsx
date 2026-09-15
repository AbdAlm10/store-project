import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Check,
  Circle,
  Eye,
  Palette,
  Plus,
  Share2,
  Store,
  Tags,
} from "lucide-react";
import { ShareStoreLinkButton } from "@/features/dashboard/copy-store-url";
import { getServices } from "@/infrastructure/container";
import {
  getDashboardProfile,
  getDashboardStores,
} from "@/lib/dashboard-request";
import { storeUrl } from "@/lib/social/sharing";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  QuickAction,
  StatusBadge,
} from "@/components/dashboard/page-header";
import {
  DashboardCard,
  SectionTitle,
} from "@/components/dashboard/ui";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { LiveMetrics } from "@/components/dashboard/live-metrics";
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
  const [{ profile }, stores] = await Promise.all([
    getDashboardProfile(),
    getDashboardStores(),
  ]);
  if (stores.length === 0) redirect("/onboarding");

  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const store = stores[0];
  const [products, categories, stats] = await Promise.all([
    services.products.listForMerchant(store.id, { pageSize: 5 }),
    services.categories.listForMerchant(store.id),
    // Home cards only — skip expensive topProducts scan.
    services.analytics.getDashboardStats(store.id, 7, {
      includeTopProducts: false,
    }),
  ]);

  const health = computeStoreHealth({
    store,
    productCount: products.total,
    categoryCount: categories.length,
  });

  const isNew = products.total === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={store.name}
        description={t("dashboardDesc")}
        actions={
          <DashboardTopBar
            storeName={store.name}
            storeSlug={store.slug}
            storeLogoUrl={store.logoUrl}
            userName={profile.fullName ?? ""}
            userEmail={profile.email}
            labels={{
              addProduct: t("addProduct"),
              store: t("store"),
              account: t("account"),
              name: t("name"),
              email: t("email"),
              signOut: t("navSignOut"),
            }}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={store.status} />
        <code className="max-w-full truncate text-sm text-slate-500">
          {storeUrl(store.slug)}
        </code>
        <ShareStoreLinkButton url={storeUrl(store.slug)} />
      </div>

      {health.percent < 100 ? (
        <DashboardCard className="bg-[#f7f2e8] border-transparent shadow-none">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t("storeSetup")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("healthComplete", {
                  completed: health.completed,
                  total: health.total,
                })}
              </p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{health.percent}%</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-brand-400 transition-all"
              style={{ width: `${health.percent}%` }}
            />
          </div>
          <ul className="mt-4 max-h-40 space-y-0.5 overflow-y-auto ys-scrollbar-none">
            {health.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2 rounded-xl px-1 py-1.5 text-sm text-slate-600 transition hover:bg-white/60 hover:text-slate-900"
                >
                  {item.done ? (
                    <Check className="h-4 w-4 text-brand-600" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300" aria-hidden />
                  )}
                  <span className={item.done ? "text-slate-400" : "font-medium text-slate-800"}>
                    {t(item.labelKey)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DashboardCard>
      ) : null}

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

      <LiveMetrics
        storeId={store.id}
        rangeDays={7}
        initial={stats}
        includeTopProducts={false}
        productsCount={products.total}
        productsLabel={t("productsCount")}
        productsHint="7d"
        cards={[
          {
            key: "storeViews",
            label: t("storeViews7d"),
            icon: "eye",
            hint: t("storeViews"),
          },
          {
            key: "productViews",
            label: t("productViews7d"),
            icon: "share",
          },
          {
            key: "whatsappClicks",
            label: t("whatsappClicks7d"),
            icon: "message",
          },
        ]}
      />

      <section>
        <SectionTitle title={t("quickActions")} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickAction
            href="/dashboard/products/new"
            label={t("qaAddProduct")}
            description={t("qaAddProductDesc")}
            icon={Plus}
          />
          <QuickAction
            href="/dashboard/store"
            label={t("qaEditStore")}
            description={t("qaEditStoreDesc")}
            icon={Store}
          />
          <QuickAction
            href="/dashboard/store-design"
            label={t("qaCustomize")}
            description={t("qaCustomizeDesc")}
            icon={Palette}
          />
          <QuickAction
            href="/dashboard/categories"
            label={t("qaCategories")}
            description={t("qaCategoriesDesc")}
            icon={Tags}
          />
          <QuickAction
            href="/dashboard/analytics"
            label={t("qaAnalytics")}
            description={t("qaAnalyticsDesc")}
            icon={Eye}
          />
          <QuickAction
            href={`/${store.slug}`}
            label={t("qaPreview")}
            description={t("qaPreviewDesc")}
            icon={Share2}
          />
        </div>
      </section>

      <section>
        <SectionTitle
          title={t("recentProducts")}
          action={
            <Link
              href="/dashboard/products"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              {t("viewAll")}
            </Link>
          }
        />
        {products.items.length === 0 ? (
          <EmptyState
            title={t("emptyProducts")}
            description={t("emptyProductsHint")}
            action={
              <Link href="/dashboard/products/new">
                <Button>{t("addProduct")}</Button>
              </Link>
            }
          />
        ) : (
          <DashboardCard padding="none">
            <ul className="divide-y divide-slate-100">
              {products.items.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
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
          </DashboardCard>
        )}
      </section>
    </div>
  );
}
