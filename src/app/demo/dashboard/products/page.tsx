import { ProductsWorkspace } from "@/features/products/products-workspace";
import {
  demoCategories,
  demoLimits,
  demoProducts,
  demoStore,
} from "@/features/demo/catalog";
import { getRequestLocale } from "@/i18n/get-locale";

export const metadata = {
  title: "المنتجات",
  robots: { index: false, follow: false },
};

export default async function DemoProductsPage() {
  const locale = await getRequestLocale();
  const products = demoProducts();
  return (
    <ProductsWorkspace
      storeId={demoStore.id}
      storeSlug={demoStore.slug}
      products={products}
      categories={demoCategories}
      locale={locale}
      maxProducts={demoLimits.maxProducts}
      productTotal={products.length}
    />
  );
}
