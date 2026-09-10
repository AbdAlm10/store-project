import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { Badge } from "@/components/ui/feedback";
import { SafeImage } from "@/components/ui/safe-image";
import { StoreNav } from "@/components/storefront/store-header";
import { ProductPurchasePanel } from "@/components/storefront/product-purchase-panel";
import { discountPercent } from "@/domain/rules/store-rules";
import {
  buildWhatsAppOrderMessage,
  formatMoney,
  productShareText,
  productUrl,
} from "@/lib/social/sharing";
import { appConfig } from "@/config/app";
import {
  DEFAULT_THEME_TOKENS,
  resolveThemeTokens,
  storefrontCssVars,
} from "@/config/themes";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import {
  getCachedStorefront,
  getStorefrontProduct,
} from "@/lib/storefront-data";

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

  void getServices().analytics.track({
    storeId: store.id,
    productId: product.id,
    eventType: "product_view",
    path: `/${store.slug}/products/${product.slug}`,
  });

  const discount = discountPercent(product.price, product.compareAtPrice);
  const wa = buildWhatsAppOrderMessage({
    store,
    product,
    storeSlug: store.slug,
    productSlug: product.slug,
  });
  const url = productUrl(store.slug, product.slug);
  const shareText = productShareText(store, product);
  const primaryImage = product.images[0];

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

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2 lg:py-12 sm:px-6">
        <div>
          <Link
            href={`/${store.slug}`}
            prefetch
            className="text-sm font-medium transition hover:opacity-80"
            style={{ color: "var(--store-accent)" }}
          >
            ← {store.name}
          </Link>
          <div
            className="relative mt-4 aspect-square overflow-hidden"
            style={{
              background: "var(--store-card)",
              boxShadow: "inset 0 0 0 1px var(--store-border)",
              borderRadius: "var(--store-radius)",
            }}
          >
            {primaryImage ? (
              <SafeImage
                src={primaryImage.url}
                alt={primaryImage.alt ?? product.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : null}
          </div>
          {product.images.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.images.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square overflow-hidden"
                  style={{
                    background: "var(--store-card)",
                    boxShadow: "inset 0 0 0 1px var(--store-border)",
                    borderRadius: "calc(var(--store-radius) * 0.55)",
                  }}
                >
                  <SafeImage
                    src={image.url}
                    alt={image.alt ?? product.name}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-2xl bg-[var(--store-surface)]" />
          }
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {product.category ? (
                <Badge
                  style={{
                    background: "var(--store-surface)",
                    color: "var(--store-text)",
                    boxShadow: "inset 0 0 0 1px var(--store-border)",
                  }}
                >
                  {product.category.name}
                </Badge>
              ) : null}
              {discount ? (
                <Badge
                  style={{
                    background: "var(--store-accent)",
                    color: "var(--store-button-text)",
                  }}
                >
                  -{discount}%
                </Badge>
              ) : null}
            </div>
            <h1
              className="text-3xl tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--store-font-display)" }}
            >
              {product.name}
            </h1>
            {product.description ? (
              <p
                className="leading-relaxed"
                style={{ color: "var(--store-muted)" }}
              >
                {product.description}
              </p>
            ) : null}

            {Object.keys(product.specifications).length > 0 ? (
              <dl
                className="grid grid-cols-2 gap-3 p-4"
                style={{
                  background: "var(--store-card)",
                  boxShadow: "inset 0 0 0 1px var(--store-border)",
                  borderRadius: "var(--store-radius)",
                }}
              >
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key}>
                    <dt
                      className="text-xs uppercase tracking-wide"
                      style={{ color: "var(--store-muted)" }}
                    >
                      {key}
                    </dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <ProductPurchasePanel
              store={store}
              productName={product.name}
              basePrice={product.price}
              compareAtPrice={product.compareAtPrice}
              currency={product.currency}
              stock={product.stock}
              variants={product.variants}
              optionSchema={product.category?.optionSchema ?? []}
              whatsappUrl={wa?.url ?? null}
              shareUrl={url}
              shareText={shareText}
            />

            <p className="text-xs" style={{ color: "var(--store-muted)" }}>
              {t("poweredBy")} {appConfig.name}
            </p>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
