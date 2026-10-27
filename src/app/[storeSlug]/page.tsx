import { StorefrontPlanCredit } from "@/components/brand/storefront-plan-credit";
import { DraftPreviewBanner } from "@/components/storefront/draft-preview-banner";
import { ProductCardSkeleton } from "@/components/storefront/product-card";
import { StoreCatalog } from "@/components/storefront/store-catalog";
import { StoreNav } from "@/components/storefront/store-header";
import { StorefrontViewTracker } from "@/components/storefront/storefront-view-tracker";
import { SubscriptionPreviewBanner } from "@/components/storefront/subscription-preview-banner";
import { SubscriptionLockedView } from "@/components/storefront/subscription-locked-view";
import { appConfig } from "@/config/app";
import {
  DEFAULT_THEME_TOKENS,
  resolveThemeTokens,
  storefrontCssVars,
} from "@/config/themes";
import { publicThemeOverrides } from "@/domain/plans/access";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import { storeUrl } from "@/lib/social/sharing";
import {
  getCachedPublicCatalog,
  getCachedPublicCategories,
  getCachedPublicFeatured,
  getCachedStorefront,
  getStorefrontPlanId,
} from "@/lib/storefront-data";
import { isStorefrontLocked, toLockedStore } from "@/lib/store-storefront-access";
import type { Metadata } from "next";
import { isReservedStoreSlug } from "@/lib/reserved-slugs";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type Props = PageProps<"/[storeSlug]">;

/** Soft-cache the public store route shell for client navigations. */
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeSlug } = await params;
  if (isReservedStoreSlug(storeSlug)) notFound();
  let store;
  try {
    store = await getCachedStorefront(storeSlug);
  } catch {
    store = null;
  }
  if (!store) notFound();
  return {
    title: store.name,
    description: store.description ?? `${store.name} on ${appConfig.name}`,
    alternates: { canonical: storeUrl(store.slug) },
    openGraph: {
      title: store.name,
      description: store.description ?? undefined,
      url: storeUrl(store.slug),
      images: store.logoUrl ? [store.logoUrl] : undefined,
    },
  };
}

export default async function PublicStorePage({ params, searchParams }: Props) {
  const { storeSlug } = await params;
  if (isReservedStoreSlug(storeSlug)) notFound();
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : undefined;
  const categorySlug =
    typeof query.category === "string" ? query.category : undefined;

  let store;
  try {
    store = await getCachedStorefront(storeSlug);
  } catch {
    store = null;
  }
  if (!store) notFound();

  if (isStorefrontLocked(store)) {
    store = toLockedStore(store);
  }

  const locale = await getRequestLocale(store.defaultLocale);
  const t = createTranslator(locale);
  const isPreview = store.status !== "published";
  const isSubscriptionPreview = store.status === "restricted";
  const planIdForTheme = await getStorefrontPlanId(store.id);
  const themeTokens = resolveThemeTokens(
    DEFAULT_THEME_TOKENS,
    publicThemeOverrides(planIdForTheme, store.themeOverrides),
    store.primaryColor,
  );
  const cssVars = storefrontCssVars(themeTokens);

  if (isSubscriptionPreview) {
    const planId = await getStorefrontPlanId(store.id);
    return (
      <div
        className="flex min-h-dvh flex-col"
        style={{
          ...cssVars,
          background: "var(--store-bg)",
          color: "var(--store-text)",
          fontFamily: "var(--store-font-body)",
        }}
      >
        <div className="flex-1">
          <SubscriptionLockedView
            store={store}
            title={t("subscriptionStoreLockedTitle")}
            body={t("subscriptionStoreLockedBody")}
          />
        </div>
        {planId !== "pro" ? (
          <footer className="py-3 text-center">
            <StorefrontPlanCredit planId={planId} />
          </footer>
        ) : null}
      </div>
    );
  }

  const utmSource =
    typeof query.utm_source === "string" ? query.utm_source : null;

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{
        ...cssVars,
        background: "var(--store-bg)",
        color: "var(--store-text)",
        fontFamily: "var(--store-font-body)",
      }}
    >
      <StorefrontViewTracker
        storeId={store.id}
        eventType="store_view"
        path={`/${store.slug}`}
        source={utmSource}
      />
      {isPreview ? (
        isSubscriptionPreview ? (
          <SubscriptionPreviewBanner
            message={t("subscriptionPreviewMessage")}
            action={t("upgradeSubscription")}
          />
        ) : (
          <DraftPreviewBanner
            storeId={store.id}
            hasWhatsapp={Boolean(store.whatsapp?.trim())}
            message={t("draftStorePreview")}
            publishLabel={t("publishThisStore")}
            whatsappLabel={t("whatsappRequiredToPublish")}
          />
        )
      ) : null}
      <StoreNav store={store} />

      <div className="flex-1">
        <Suspense fallback={<CatalogSkeleton />}>
          <StoreCatalogSection
            store={store}
            search={search}
            categorySlug={categorySlug}
          />
        </Suspense>
      </div>

      <footer
        className="mt-auto px-4 pt-8 text-center"
        style={{
          background: "var(--store-bg)",
          color: "var(--store-muted)",
          paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <p
          className="text-xs font-medium tracking-tight"
          style={{ color: "var(--store-muted)" }}
        >
          {store.name}
        </p>
        <div className="mt-1 flex justify-center">
          <StorefrontPlanCredit
            planId={await getStorefrontPlanId(store.id)}
            className="text-xs font-normal"
          />
        </div>
      </footer>
    </div>
  );
}

async function StoreCatalogSection({
  store,
  search,
  categorySlug,
}: {
  store: Awaited<ReturnType<typeof getCachedStorefront>>;
  search?: string;
  categorySlug?: string;
}) {
  // Draft preview must bypass public cache (published-only).
  const [categories, featured, catalog] =
    store.status === "published"
      ? await Promise.all([
          getCachedPublicCategories(store.id, store.slug),
          getCachedPublicFeatured(store.id, store.slug),
          getCachedPublicCatalog(store.id, store.slug),
        ])
      : await Promise.all([
          getServices().categories.listPublic(store.id),
          getServices()
            .products.listPublic(store.id, { featured: true, pageSize: 8 })
            .then((result) => result.items),
          getServices()
            .products.listPublic(store.id, { pageSize: 96 })
            .then((result) => result.items),
        ]);

  return (
    <StoreCatalog
      store={store}
      categories={categories}
      products={catalog}
      featured={featured}
      initialSearch={search}
      initialCategory={categorySlug}
    />
  );
}

function CatalogSkeleton() {
  const pulse = {
    background:
      "color-mix(in srgb, var(--store-border) 55%, var(--store-surface))",
  } as const;

  return (
    <div className="relative mx-auto w-full max-w-[100rem] px-3 pb-10 pt-2 sm:px-4 lg:px-5 xl:px-6 lg:pt-2.5">
      <div className="flex items-start gap-3 lg:gap-4" dir="ltr">
        <div className="min-w-0 flex-1" dir="rtl">
          <div className="mb-2.5 flex flex-col items-start gap-3">
            <div
              className="h-9 w-full max-w-md animate-pulse rounded-full sm:h-10"
              style={pulse}
            />
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <div
                    className="h-10 w-10 animate-pulse rounded-full sm:h-11 sm:w-11"
                    style={pulse}
                  />
                  <div className="h-2 w-10 animate-pulse rounded" style={pulse} />
                </div>
              ))}
            </div>
          </div>
          <div className="mb-3 mt-2 h-7 w-40 animate-pulse rounded" style={pulse} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
        <aside
          className="sticky top-24 hidden w-[17.5rem] shrink-0 animate-pulse rounded-[1.35rem] lg:block"
          style={{
            minHeight: "28rem",
            background: "var(--store-surface)",
            boxShadow:
              "inset 0 0 0 1px color-mix(in srgb, var(--store-border) 55%, transparent)",
          }}
        />
      </div>
    </div>
  );
}
