import { notFound, redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { ProductForm } from "@/features/products/product-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

type Props = PageProps<"/dashboard/products/[productId]">;

export const metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({ params }: Props) {
  const { productId } = await params;
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const products = await services.products.listForMerchant(store.id, {
    pageSize: 200,
  });
  const product = products.items.find((item) => item.id === productId);
  if (!product) notFound();
  const categories = await services.categories.listForMerchant(store.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("editProduct")} description={t("editProductDesc")} />
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <ProductForm
          storeId={store.id}
          productId={product.id}
          categories={categories}
          initial={{
            name: product.name,
            description: product.description ?? "",
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            stock: product.stock,
            categoryId: product.categoryId,
            status: product.status,
            tags: product.tags.join(", "),
            imageUrl: product.images[0]?.url ?? "",
            featured: product.featured,
            variants: product.variants.map((variant) => ({
              name: variant.name,
              options: variant.options,
              price: variant.price,
              stock: variant.stock,
            })),
          }}
        />
      </div>
    </div>
  );
}
