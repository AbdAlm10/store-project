import { PageHeader } from "@/components/dashboard/page-header";
import { CategoryManager } from "@/features/categories/category-manager";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import { redirect } from "next/navigation";

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
    <div className="space-y-6 pb-10">
      <PageHeader title={t("categories")} description={t("categoriesPageDesc")} />
      <CategoryManager storeId={store.id} initial={categories} />
    </div>
  );
}
