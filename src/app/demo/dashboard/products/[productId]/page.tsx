import { PageHeader } from "@/components/dashboard/page-header";
import { ProductForm } from "@/features/products/product-form";
import { demoCategories, demoLimits, demoProducts, demoStore } from "@/features/demo/catalog";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { notFound } from "next/navigation";

export const metadata = {
  title: "تعديل المنتج",
  robots: { index: false, follow: false },
};

export default async function DemoEditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = demoProducts().find((item) => item.id === productId);
  if (!product) notFound();
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={t("editProduct")} description={t("editProductDesc")} />
      <ProductForm
        storeId={demoStore.id}
        productId={product.id}
        categories={demoCategories}
        maxImagesPerProduct={demoLimits.maxImagesPerProduct}
        maxOptionsPerProduct={
          Number.isFinite(demoLimits.maxOptionsPerProduct) ? demoLimits.maxOptionsPerProduct : null
        }
        variantsEnabled={demoLimits.maxOptionsPerProduct !== 0}
        initial={{
          name: product.name,
          description: product.description ?? "",
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          stock: product.stock,
          categoryId: product.categoryId,
          status: product.status,
          tags: product.tags.join(", "),
          imageUrls: product.images
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((image) => image.url)
            .slice(0, demoLimits.maxImagesPerProduct),
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
  );
}
