import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { StoreSettingsForm } from "@/features/stores/store-settings-form";
import { demoLimits, demoStore } from "@/features/demo/catalog";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "واجهة المتجر",
  robots: { index: false, follow: false },
};

export default async function DemoStorePage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  return (
    <div className="space-y-4">
      <PageHeader title={t("storefront")} description={t("storefrontPageDesc")} />
      <DashboardCard padding="sm">
        <StoreSettingsForm store={demoStore} maxNavActions={demoLimits.maxNavActions} />
      </DashboardCard>
    </div>
  );
}
