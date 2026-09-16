import { PoweredByBrand } from "@/components/brand/powered-by-brand";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductPurchasePanel } from "@/components/storefront/product-purchase-panel";
import { RelatedProductsSection } from "@/components/storefront/related-products";
import { StoreNav } from "@/components/storefront/store-header";
import { StorefrontViewTracker } from "@/components/storefront/storefront-view-tracker";
import {
  DEFAULT_THEME_TOKENS,
  resolveThemeTokens,
  storefrontCssVars,
} from "@/config/themes";
import { discountPercent } from "@/domain/rules/store-rules";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { getRelatedProducts } from "@/lib/recommendations/related";
import {
  buildWhatsAppOrderMessage,
  formatMoney,
  productShareText,
  productUrl,
} from "@/lib/social/sharing";
import {
  getCachedStorefront,
  getStorefrontProduct,
} from "@/lib/storefront-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type Props = PageProps<"/[storeSlug]/products/[productSlug]">;

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeSlug, productSlug } = await params;
  try {
    const store = await getCachedStorefront(storeSlug);
    const product = await getStorefrontProduct(store, productSlug);
    const locale = await getRequestLocale(store.defaultLocale);
    const url = productUrl(store.slug, product.slug);
    const image = product.images[0]?.url;
    const description =
      product.description?.slice(0, 160) ??
      `${product.name} — ${formatMoney(product.price, product.currency, locale)} at ${store.name}`;

    return {
      title: `${product.name} · ${store.name}`,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `${product.name} · ${formatMoney(product.price, product.currency, locale)}`,
        description: `${store.name} — ${description}`,
        url,
        images: image ? [{ url: image }] : undefined,
      },
    };
  } catch {
    return { title: "Product not found" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { storeSlug, productSlug } = await params;

  let store;
  let product;
  try {
    store = await getCachedStorefront(storeSlug);
    product = await getStorefrontProduct(store, productSlug);
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

  const discount = discountPercent(product.price, product.compareAtPrice);
  const wa = buildWhatsAppOrderMessage({
    store,
    product,
    storeSlug: store.slug,
    productSlug: product.slug,
  });
  const url = productUrl(store.slug, product.slug);
  const shareText = productShareText(store, product);
  const subtitle = product.category?.name ?? null;
  const related = await getRelatedProducts(store, product, 8);

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
      <StorefrontViewTracker
        storeId={store.id}
        productId={product.id}
        eventType="product_view"
        path={`/${store.slug}/products/${product.slug}`}
      />
      <StoreNav store={store} />

      <div className="w-full px-4 pt-4 pb-5 sm:px-8 sm:pt-5 sm:pb-8 lg:px-12 xl:px-16">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-20 2xl:gap-24">
          <div className="lg:sticky lg:top-[calc(var(--store-logo-size)+2rem)] lg:self-start">
            <ProductGallery
              images={product.images}
              productName={product.name}
              storeSlug={store.slug}
              productId={product.id}
              featured={product.featured}
              discount={discount}
              featuredLabel={t("featured")}
              accent={store.primaryColor}
            />
          </div>

          <Suspense
            fallback={
              <div className="flex min-w-0 flex-col gap-5 lg:gap-8">
                <div className="space-y-3">
                  <div
                    className="h-10 w-2/3 animate-pulse rounded"
                    style={{
                      background:
                        "color-mix(in srgb, var(--store-border) 55%, transparent)",
                    }}
                  />
                  <div
                    className="h-3.5 w-full animate-pulse rounded"
                    style={{
                      background:
                        "color-mix(in srgb, var(--store-border) 40%, transparent)",
                    }}
                  />
                  <div
                    className="h-3.5 w-4/5 animate-pulse rounded"
                    style={{
                      background:
                        "color-mix(in srgb, var(--store-border) 35%, transparent)",
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-11 w-11 animate-pulse rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb, var(--store-border) 50%, transparent)",
                    }}
                  />
                ))}
                </div>
                <div className="mt-auto flex gap-3 pt-4">
                  <div
                    className="h-14 flex-1 animate-pulse rounded-2xl"
                    style={{
                      background:
                        "color-mix(in srgb, var(--store-border) 50%, transparent)",
                    }}
                  />
                  <div
                    className="h-14 w-14 animate-pulse rounded-2xl"
                    style={{
                      background:
                        "color-mix(in srgb, var(--store-border) 50%, transparent)",
                    }}
                  />
                </div>
              </div>
            }
          >
            <div className="flex min-w-0 flex-col gap-5 lg:gap-8">
              <header className="space-y-2">
                <div className="hidden flex-wrap items-center gap-2.5 sm:flex">
                  {discount ? (
                    <span
                      className="text-sm font-bold"
                      style={{ color: "var(--store-accent)" }}
                    >
                      -{discount}%
                    </span>
                  ) : null}
                  {product.featured ? (
                    <span
                      className="text-md font-bold"
                      style={{ color: "var(--store-text)" }}
                    >
                      {t("featured")}
                    </span>
                  ) : null}
                </div>

                <h1
                  className="text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl"
                  style={{ fontFamily: "var(--store-font-display)" }}
                >
                  {product.name}
                </h1>

                {subtitle ? (
                  <p
                    className="text-base sm:text-lg"
                    style={{ color: "var(--store-muted)" }}
                  >
                    {subtitle}
                  </p>
                ) : null}

                {product.description ? (
                  <p
                    className="max-w-2xl text-base leading-relaxed sm:text-lg"
                    style={{
                      color:
                        "color-mix(in srgb, var(--store-muted) 88%, var(--store-text))",
                    }}
                  >
                    {product.description}
                  </p>
                ) : null}
              </header>

              <ProductPurchasePanel
                store={store}
                productId={product.id}
                productName={product.name}
                basePrice={product.price}
                compareAtPrice={product.compareAtPrice}
                currency={product.currency}
                stock={product.stock}
                variants={product.variants}
                optionSchema={product.category?.optionSchema ?? []}
                specifications={product.specifications}
                whatsappUrl={wa?.url ?? null}
                shareUrl={url}
                shareText={shareText}
              />

              <PoweredByBrand className="mt-1" />
            </div>
          </Suspense>
        </div>

        <RelatedProductsSection
          storeSlug={store.slug}
          products={related}
          locale={locale}
          accent={store.primaryColor}
          title={t("relatedProducts")}
        />
      </div>
    </div>
  );
}
