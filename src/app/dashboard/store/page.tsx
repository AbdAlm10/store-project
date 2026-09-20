import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { StoreSettingsForm } from "@/features/stores/store-settings-form";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import { redirect } from "next/navigation";

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
  const maxNavActions = await services.entitlements.maxNavActions(store.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("storefront")}
        description={t("storefrontPageDesc")}
      />

      <DashboardCard padding="sm">
        <StoreSettingsForm store={store} maxNavActions={maxNavActions} />
      </DashboardCard>
    </div>
  );
}
