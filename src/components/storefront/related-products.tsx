import { ProductCard } from "@/components/storefront/product-card";
import type { ProductWithMedia } from "@/domain/types/entities";
import type { Locale } from "@/i18n/config";

export function RelatedProductsSection({
  storeSlug,
  products,
  locale,
  accent,
  title,
}: {
  storeSlug: string;
  products: ProductWithMedia[];
  locale: Locale;
  accent?: string;
  title: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mt-8 pt-6 sm:mt-10 sm:pt-8">
      <div className="mb-3 sm:mb-4">
        <h2
          className="text-xl font-bold tracking-tight sm:text-2xl"
          style={{ fontFamily: "var(--store-font-display)" }}
        >
          {title}
        </h2>
      </div>

      <div className="ys-scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="w-[11.5rem] shrink-0 sm:w-auto animate-ys-rise"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <ProductCard
              product={product}
              href={`/${storeSlug}/products/${product.slug}`}
              storeSlug={storeSlug}
              accent={accent}
              locale={locale}
              priority={index < 2}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
