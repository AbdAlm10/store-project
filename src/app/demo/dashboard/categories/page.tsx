import { PageHeader } from "@/components/dashboard/page-header";
import { CategoryManager } from "@/features/categories/category-manager";
import { demoCategories, demoLimits, demoStore } from "@/features/demo/catalog";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "التصنيفات",
  robots: { index: false, follow: false },
};

export default async function DemoCategoriesPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("categories")} description={t("categoriesPageDesc")} />
      <CategoryManager
        storeId={demoStore.id}
        initial={demoCategories}
        maxCategories={demoLimits.maxCategories}
        maxOptionsPerProduct={demoLimits.maxOptionsPerProduct}
      />
    </div>
  );
}
