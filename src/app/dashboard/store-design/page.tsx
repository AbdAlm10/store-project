import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { StoreDesignForm } from "@/features/stores/store-design-form";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import Link from "next/link";
import { redirect } from "next/navigation";

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
  const themeAccess = await services.entitlements.themeAccess(store.id);
  const fullThemeCustomization = themeAccess === "full";

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title={t("storeDesignTitle")}
        description={t("storeDesignDesc")}
        actions={
          <Link href={`/${store.slug}`} target="_blank">
            <Button variant="outline">{t("previewLiveStore")}</Button>
          </Link>
        }
      />
      {themeAccess === "none" ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("freeThemesLocked")}
        </p>
      ) : (
      <StoreDesignForm
        store={store}
        fullThemeCustomization={fullThemeCustomization}
      />
      )}
    </div>
  );
}
