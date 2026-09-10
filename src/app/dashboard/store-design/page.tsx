import { redirect } from "next/navigation";
import Link from "next/link";
import { getServices } from "@/infrastructure/container";
import { PageHeader } from "@/components/dashboard/page-header";
import { StoreDesignForm } from "@/features/stores/store-design-form";
import { Button } from "@/components/ui/button";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "Store design",
  robots: { index: false, follow: false },
};

export default async function StoreDesignPage() {
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("storeDesignTitle")}
        description={t("storeDesignDesc")}
        actions={
          <Link href={`/${store.slug}`} target="_blank">
            <Button variant="outline">{t("previewLiveStore")}</Button>
          </Link>
        }
      />
      <StoreDesignForm store={store} />
    </div>
  );
}
