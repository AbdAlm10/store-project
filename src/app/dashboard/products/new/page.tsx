import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { ProductForm } from "@/features/products/product-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "New product",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const categories = await services.categories.listForMerchant(store.id);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={t("addProduct")} description={t("addProductDesc")} />
      <ProductForm storeId={store.id} categories={categories} />
    </div>
  );
}
