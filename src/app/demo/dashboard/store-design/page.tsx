import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { StoreDesignForm } from "@/features/stores/store-design-form";
import { DEMO_STORE_PATH, demoStore } from "@/features/demo/catalog";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import Link from "next/link";

export const metadata = {
  title: "تصميم المتجر",
  robots: { index: false, follow: false },
};

export default async function DemoStoreDesignPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title={t("storeDesignTitle")}
        description={t("storeDesignDesc")}
        actions={
          <Link href={DEMO_STORE_PATH} target="_blank">
            <Button variant="outline">{t("previewLiveStore")}</Button>
          </Link>
        }
      />
      <StoreDesignForm store={demoStore} fullThemeCustomization />
    </div>
  );
}
