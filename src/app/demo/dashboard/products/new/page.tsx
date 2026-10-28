import { PageHeader } from "@/components/dashboard/page-header";
import { ProductForm } from "@/features/products/product-form";
import { demoCategories, demoLimits, demoStore } from "@/features/demo/catalog";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "منتج جديد",
  robots: { index: false, follow: false },
};

export default async function DemoNewProductPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={t("addProduct")} description={t("addProductDesc")} />
      <ProductForm
        storeId={demoStore.id}
        categories={demoCategories}
        maxImagesPerProduct={demoLimits.maxImagesPerProduct}
        maxOptionsPerProduct={
          Number.isFinite(demoLimits.maxOptionsPerProduct) ? demoLimits.maxOptionsPerProduct : null
        }
        variantsEnabled={demoLimits.maxOptionsPerProduct !== 0}
      />
    </div>
  );
}
