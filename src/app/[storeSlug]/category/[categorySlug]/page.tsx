import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/storefront/product-card";
import { StoreNav } from "@/components/storefront/store-header";
import { EmptyState } from "@/components/ui/feedback";
import { categoryUrl } from "@/lib/social/sharing";
import {
  DEFAULT_THEME_TOKENS,
  resolveThemeTokens,
  storefrontCssVars,
} from "@/config/themes";
import {
  getCachedPublicCatalog,
  getCachedPublicCategories,
  getCachedStorefront,
} from "@/lib/storefront-data";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

type Props = PageProps<"/[storeSlug]/category/[categorySlug]">;

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeSlug, categorySlug } = await params;
  try {
    const store = await getCachedStorefront(storeSlug);
    const categories = await getCachedPublicCategories(store.id, store.slug);
    const category = categories.find((item) => item.slug === categorySlug);
    if (!category) return { title: "Category not found" };
    return {
      title: `${category.name} · ${store.name}`,
      description: `Browse ${category.name} at ${store.name}`,
      alternates: { canonical: categoryUrl(store.slug, category.slug) },
    };
  } catch {
    return { title: "Category not found" };
  }
}

export default async function CategoryPage({ params }: Props) {
  const { storeSlug, categorySlug } = await params;
  let store;
  try {
    store = await getCachedStorefront(storeSlug);
  } catch {
    notFound();
  }

  const locale = await getRequestLocale(store.defaultLocale);
  const t = createTranslator(locale);
  const themeTokens = resolveThemeTokens(
    DEFAULT_THEME_TOKENS,
    store.themeOverrides,
    store.primaryColor,
  );
  const cssVars = storefrontCssVars(themeTokens);

  const [categories, catalog] = await Promise.all([
    getCachedPublicCategories(store.id, store.slug),
    getCachedPublicCatalog(store.id, store.slug),
  ]);
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) notFound();

  const items = catalog.filter((product) => product.categoryId === category.id);

  return (
    <div
      className="min-h-full"
      style={{
        ...cssVars,
        background: "var(--store-bg)",
        color: "var(--store-text)",
        fontFamily: "var(--store-font-body)",
      }}
    >
      <StoreNav store={store} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href={`/${store.slug}`}
          prefetch
          className="text-sm font-medium"
          style={{ color: "var(--store-accent)" }}
        >
          ← {store.name}
        </Link>
        <h1
          className="mt-4 text-3xl tracking-tight"
          style={{ fontFamily: "var(--store-font-display)" }}
        >
          {category.name}
        </h1>
        {items.length === 0 ? (
          <div className="mt-8">
            <EmptyState title={t("noProductsFound")} />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                href={`/${store.slug}/products/${product.slug}`}
                accent={store.primaryColor}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
