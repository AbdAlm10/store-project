import { redirect } from "next/navigation";
import Link from "next/link";
import { getServices } from "@/infrastructure/container";
import { PageHeader, StatusBadge } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { StoreSettingsForm } from "@/features/stores/store-settings-form";
import { CopyStoreUrl } from "@/features/dashboard/copy-store-url";
import { storeUrl } from "@/lib/social/sharing";
import { Button } from "@/components/ui/button";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "Storefront",
  robots: { index: false, follow: false },
};

export default async function StorePage() {
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("storefront")}
        description={t("storefrontPageDesc")}
        actions={
          <>
            <Link href={`/${store.slug}`} target="_blank">
              <Button variant="outline">{t("previewStore")}</Button>
            </Link>
            <Link href="/dashboard/store-design">
              <Button variant="secondary">{t("design")}</Button>
            </Link>
          </>
        }
      />

      <DashboardCard padding="sm">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={store.status} />
          <code className="break-all text-sm text-slate-600">
            {storeUrl(store.slug)}
          </code>
          <CopyStoreUrl url={storeUrl(store.slug)} />
        </div>
      </DashboardCard>

      <DashboardCard>
        <StoreSettingsForm store={store} />
      </DashboardCard>
    </div>
  );
}
