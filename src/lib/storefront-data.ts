import { cache } from "react";
import { unstable_cache } from "next/cache";
import { AppError } from "@/domain/errors";
import type {
  Category,
  ProductWithMedia,
  Store,
} from "@/domain/types/entities";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabasePublicClient } from "@/infrastructure/supabase/public-client";
import {
  mapCategory,
  mapImage,
  mapProduct,
  mapStore,
  mapVariant,
  withMedia,
} from "@/infrastructure/supabase/mappers";
import { getServices } from "@/infrastructure/container";
import {
  storeCategoriesTag,
  storeIdTag,
  storeProductsTag,
  storeTag,
} from "@/lib/cache-tags";

const REVALIDATE_SECONDS = 60;

async function loadPublishedStore(slug: string): Promise<Store> {
  if (!isSupabaseConfigured()) {
    const store = await getServices().stores.getPublicStoreBySlug(slug);
    return store;
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", error.message);
  if (!data) throw new AppError("NOT_FOUND", "Store not found.");
  return mapStore(data);
}

async function loadPublicCategories(storeId: string): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return getServices().categories.listPublic(storeId);
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  if (error) throw new AppError("INTERNAL", error.message);
  return (data ?? []).map(mapCategory);
}

async function loadPublicProducts(
  storeId: string,
  options?: { featured?: boolean; pageSize?: number },
): Promise<ProductWithMedia[]> {
  if (!isSupabaseConfigured()) {
    const result = await getServices().products.listPublic(storeId, {
      featured: options?.featured,
      pageSize: options?.pageSize ?? 96,
    });
    return result.items;
  }

  const supabase = createSupabasePublicClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(options?.pageSize ?? 96);

  if (options?.featured) {
    query = query.eq("featured", true);
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", error.message);
  const products = (data ?? []).map(mapProduct);
  return attachPublicMediaMany(products);
}

async function loadPublicProductBySlug(
  storeId: string,
  productSlug: string,
): Promise<ProductWithMedia> {
  if (!isSupabaseConfigured()) {
    return getServices().products.getPublicBySlug(storeId, productSlug);
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("slug", productSlug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", error.message);
  if (!data) throw new AppError("NOT_FOUND", "Product not found.");
  const [product] = await attachPublicMediaMany([mapProduct(data)]);
  return product;
}

async function attachPublicMediaMany(
  products: ReturnType<typeof mapProduct>[],
): Promise<ProductWithMedia[]> {
  if (products.length === 0) return [];

  const supabase = createSupabasePublicClient();
  const ids = products.map((item) => item.id);
  const categoryIds = [
    ...new Set(
      products
        .map((item) => item.categoryId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: images }, { data: variants }, { data: categories }] =
    await Promise.all([
      supabase
        .from("product_images")
        .select("*")
        .in("product_id", ids)
        .order("sort_order", { ascending: true }),
      supabase.from("product_variants").select("*").in("product_id", ids),
      categoryIds.length
        ? supabase.from("categories").select("*").in("id", categoryIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

  const imageRows = (images ?? []).map(mapImage);
  const variantRows = (variants ?? []).map(mapVariant);
  const categoryMap = new Map(
    (categories ?? []).map((row) => {
      const category = mapCategory(row as Record<string, unknown>);
      return [category.id, category] as const;
    }),
  );

  return products.map((product) =>
    withMedia(
      product,
      imageRows.filter((image) => image.productId === product.id),
      variantRows.filter((variant) => variant.productId === product.id),
      product.categoryId ? (categoryMap.get(product.categoryId) ?? null) : null,
    ),
  );
}

/** Cross-request cached published store (ISR-style, 60s + tag purge). */
export function getCachedPublicStore(slug: string): Promise<Store> {
  return unstable_cache(
    async () => loadPublishedStore(slug),
    ["storefront-store", slug],
    {
      revalidate: REVALIDATE_SECONDS,
      tags: [storeTag(slug), "stores"],
    },
  )();
}

export function getCachedPublicCategories(
  storeId: string,
  slug: string,
): Promise<Category[]> {
  return unstable_cache(
    async () => loadPublicCategories(storeId),
    ["storefront-categories", storeId],
    {
      revalidate: REVALIDATE_SECONDS,
      tags: [storeCategoriesTag(slug), storeTag(slug), storeIdTag(storeId)],
    },
  )();
}

export function getCachedPublicCatalog(
  storeId: string,
  slug: string,
): Promise<ProductWithMedia[]> {
  return unstable_cache(
    async () => loadPublicProducts(storeId, { pageSize: 96 }),
    ["storefront-catalog", storeId],
    {
      revalidate: REVALIDATE_SECONDS,
      tags: [storeProductsTag(slug), storeTag(slug), storeIdTag(storeId)],
    },
  )();
}

export function getCachedPublicFeatured(
  storeId: string,
  slug: string,
): Promise<ProductWithMedia[]> {
  return unstable_cache(
    async () => loadPublicProducts(storeId, { featured: true, pageSize: 8 }),
    ["storefront-featured", storeId],
    {
      revalidate: REVALIDATE_SECONDS,
      tags: [storeProductsTag(slug), storeTag(slug), storeIdTag(storeId)],
    },
  )();
}

export function getCachedPublicProduct(
  storeId: string,
  slug: string,
  productSlug: string,
): Promise<ProductWithMedia> {
  return unstable_cache(
    async () => loadPublicProductBySlug(storeId, productSlug),
    ["storefront-product", storeId, productSlug],
    {
      revalidate: REVALIDATE_SECONDS,
      tags: [
        storeProductsTag(slug),
        storeTag(slug),
        storeIdTag(storeId),
        `product:${slug}:${productSlug}`,
      ],
    },
  )();
}

/**
 * Request-scoped dedupe for metadata + page.
 * Tries published cache first; falls back to owner draft preview (dynamic/cookies).
 */
export const getCachedStorefront = cache(async (slug: string): Promise<Store> => {
  try {
    return await getCachedPublicStore(slug);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return getServices().stores.getStorefrontBySlug(slug);
    }
    // Cached/public path may fail for non-AppError reasons — still try preview.
    try {
      return await getServices().stores.getStorefrontBySlug(slug);
    } catch {
      throw error;
    }
  }
});

/**
 * Published products from cache; members can open draft-store / draft-product previews.
 */
export const getStorefrontProduct = cache(
  async (
    store: Store,
    productSlug: string,
  ): Promise<ProductWithMedia> => {
    if (store.status === "published") {
      try {
        return await getCachedPublicProduct(
          store.id,
          store.slug,
          productSlug,
        );
      } catch (error) {
        // Fall through to cookie-aware preview (e.g. draft product on live store).
        if (!(error instanceof AppError) || error.code !== "NOT_FOUND") {
          try {
            return await getServices().products.getStorefrontBySlug(
              store.id,
              productSlug,
            );
          } catch {
            throw error;
          }
        }
      }
    }

    return getServices().products.getStorefrontBySlug(store.id, productSlug);
  },
);
