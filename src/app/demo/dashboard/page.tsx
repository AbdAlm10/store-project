import Link from "next/link";
import { Eye, Palette, Plus, Share2, Store, Tags } from "lucide-react";
import { ShareStoreLinkButton } from "@/features/dashboard/copy-store-url";
import { PageHeader, QuickAction, StatusBadge } from "@/components/dashboard/page-header";
import { DashboardCard, SectionTitle } from "@/components/dashboard/ui";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { LiveMetrics } from "@/components/dashboard/live-metrics";
import { computeStoreHealth } from "@/domain/rules/store-health";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import {
  DEMO_DASHBOARD_BASE,
  DEMO_STORE_PATH,
  demoDashboardStats,
  demoProducts,
  demoProfile,
  demoStore,
  demoCategories,
} from "@/features/demo/catalog";

export const metadata = {
  title: "لوحة التحكم",
  robots: { index: false, follow: false },
};

export default async function DemoDashboardHomePage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const products = demoProducts();
  const stats = demoDashboardStats(7);
  const health = computeStoreHealth({
    store: demoStore,
    productCount: products.length,
    categoryCount: demoCategories.length,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={demoStore.name}
        description={t("dashboardDesc")}
        actions={
          <DashboardTopBar
            storeName={demoStore.name}
            storeSlug={demoStore.slug}
            storeLogoUrl={demoStore.logoUrl}
            userName={demoProfile.fullName ?? ""}
            userEmail={demoProfile.email}
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
        <StatusBadge status={demoStore.status} />
        <code className="max-w-full truncate text-sm text-slate-500">{DEMO_STORE_PATH}</code>
        <ShareStoreLinkButton url={DEMO_STORE_PATH} />
      </div>

      {health.percent < 100 ? (
        <DashboardCard className="border-transparent bg-[#f7f2e8] shadow-none">
          <p className="text-sm text-slate-500">
            {t("healthComplete", { completed: health.completed, total: health.total })}
          </p>
        </DashboardCard>
      ) : null}

      <LiveMetrics
        storeId={demoStore.id}
        rangeDays={7}
        initial={stats}
        includeTopProducts={false}
        productsCount={products.length}
        productsLabel={t("productsCount")}
        productsHint="7d"
        cards={[
          { key: "storeViews", label: t("storeViews7d"), icon: "eye", hint: t("storeViews") },
          { key: "productViews", label: t("productViews7d"), icon: "share" },
          { key: "whatsappClicks", label: t("whatsappClicks7d"), icon: "message" },
        ]}
      />

      <section>
        <SectionTitle title={t("quickActions")} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickAction href={`${DEMO_DASHBOARD_BASE}/products/new`} label={t("qaAddProduct")} description={t("qaAddProductDesc")} icon={Plus} />
          <QuickAction href={`${DEMO_DASHBOARD_BASE}/store`} label={t("qaEditStore")} description={t("qaEditStoreDesc")} icon={Store} />
          <QuickAction href={`${DEMO_DASHBOARD_BASE}/store-design`} label={t("qaCustomize")} description={t("qaCustomizeDesc")} icon={Palette} />
          <QuickAction href={`${DEMO_DASHBOARD_BASE}/categories`} label={t("qaCategories")} description={t("qaCategoriesDesc")} icon={Tags} />
          <QuickAction href={`${DEMO_DASHBOARD_BASE}/analytics`} label={t("qaAnalytics")} description={t("qaAnalyticsDesc")} icon={Eye} />
          <QuickAction href={DEMO_STORE_PATH} label={t("qaPreview")} description={t("qaPreviewDesc")} icon={Share2} reload />
        </div>
      </section>

      <section>
        <SectionTitle
          title={t("recentProducts")}
          action={
            <Link href={`${DEMO_DASHBOARD_BASE}/products`} className="text-sm font-medium text-brand-700 hover:underline">
              {t("viewAll")}
            </Link>
          }
        />
        <DashboardCard padding="none">
          <ul className="divide-y divide-slate-100">
            {products.slice(0, 5).map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <Link href={`${DEMO_DASHBOARD_BASE}/products/${product.id}`} className="font-medium text-slate-900 hover:underline">
                  {product.name}
                </Link>
                <StatusBadge status={product.status} />
              </li>
            ))}
          </ul>
        </DashboardCard>
      </section>
    </div>
  );
}
