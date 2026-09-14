import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { StoreNav } from "@/components/storefront/store-header";
import { StoreCatalog } from "@/components/storefront/store-catalog";
import { appConfig } from "@/config/app";
import {
  DEFAULT_THEME_TOKENS,
  resolveThemeTokens,
  storefrontCssVars,
} from "@/config/themes";
import { storeUrl } from "@/lib/social/sharing";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import {
  getCachedPublicCatalog,
  getCachedPublicCategories,
  getCachedPublicFeatured,
  getCachedStorefront,
} from "@/lib/storefront-data";

type Props = PageProps<"/[storeSlug]">;

/** Soft-cache the public store route shell for client navigations. */
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeSlug } = await params;
  try {
    const store = await getCachedStorefront(storeSlug);
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
  } catch {
    return { title: "Store not found" };
  }
}

export default async function PublicStorePage({ params, searchParams }: Props) {
  const { storeSlug } = await params;
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q : undefined;
  const categorySlug =
    typeof query.category === "string" ? query.category : undefined;

  let store;
  try {
    store = await getCachedStorefront(storeSlug);
  } catch {
    notFound();
  }

  const locale = await getRequestLocale(store.defaultLocale);
  const t = createTranslator(locale);
  const isPreview = store.status !== "published";
  const themeTokens = resolveThemeTokens(
    DEFAULT_THEME_TOKENS,
    store.themeOverrides,
    store.primaryColor,
  );
  const cssVars = storefrontCssVars(themeTokens);

  void getServices().analytics.track({
    storeId: store.id,
    eventType: "store_view",
    path: `/${store.slug}`,
    source: typeof query.utm_source === "string" ? query.utm_source : null,
  });

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
      {isPreview ? (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
          {t("draftStorePreview")}{" "}
          <Link href="/dashboard/store" className="underline" prefetch={false}>
            {t("publishStoreNow")}
          </Link>
        </div>
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
        className="mt-auto border-t py-2 text-center"
        style={{
          borderColor: "color-mix(in srgb, var(--store-border) 70%, transparent)",
          background: "var(--store-surface)",
          color: "var(--store-muted)",
        }}
      >
        <p
          className="text-xs font-semibold tracking-tight"
          style={{
            color: "var(--store-text)",
            fontFamily: "var(--store-font-display)",
          }}
        >
          {store.name}
        </p>
        <p className="mt-0.5 text-[10px] tracking-wide opacity-80">
          {t("poweredBy")} {appConfig.name}
        </p>
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
  return (
    <div className="mx-auto max-w-[100rem] px-3 py-4 sm:px-4 lg:px-5 xl:px-6">
      <div
        className="mx-auto h-11 max-w-3xl animate-pulse rounded-full"
        style={{ background: "var(--store-surface)" }}
      />
      <div className="mt-4 flex gap-2.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex shrink-0 flex-col items-center gap-1">
            <div
              className="h-10 w-10 animate-pulse rounded-full sm:h-11 sm:w-11"
              style={{ background: "var(--store-surface)" }}
            />
            <div
              className="h-2 w-8 animate-pulse rounded"
              style={{ background: "var(--store-surface)" }}
            />
          </div>
        ))}
      </div>
      <div
        className="mt-5 mb-3 h-7 w-40 animate-pulse rounded"
        style={{ background: "var(--store-surface)" }}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-3/4 animate-pulse"
            style={{
              background: "var(--store-surface)",
              borderRadius: "1.1rem",
            }}
          />
        ))}
      </div>
    </div>
  );
}
