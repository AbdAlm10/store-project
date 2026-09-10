import Link from "next/link";
import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { CategoryManager } from "@/features/categories/category-manager";
import { Button } from "@/components/ui/button";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "Categories",
  robots: { index: false, follow: false },
};

export default async function CategoriesPage() {
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const categories = await services.categories.listForMerchant(store.id);

  return (
    <div className="space-y-6">
      <PageHeader title={t("categories")} description={t("categoriesPageDesc")} />
      {categories.length === 0 ? (
        <EmptyState
          title={t("noCategoriesYet")}
          description={t("noCategoriesHint")}
        />
      ) : null}
      <CategoryManager storeId={store.id} initial={categories} />
      <Link href="/dashboard/products/new">
        <Button variant="outline">{t("addProductToCategory")}</Button>
      </Link>
    </div>
  );
}
