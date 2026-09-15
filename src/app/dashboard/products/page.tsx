import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { ProductsWorkspace } from "@/features/products/products-workspace";
import { getRequestLocale } from "@/i18n/get-locale";

export const metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

export default async function ProductsPage() {
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();

  const [products, categories] = await Promise.all([
    services.products.listForMerchant(store.id, { pageSize: 100 }),
    services.categories.listForMerchant(store.id),
  ]);

  return (
    <ProductsWorkspace
      storeId={store.id}
      storeSlug={store.slug}
      products={products.items}
      categories={categories}
      locale={locale}
    />
  );
}
