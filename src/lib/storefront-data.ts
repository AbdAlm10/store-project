import { cache } from "react";
import { unstable_cache } from "next/cache";
import { AppError } from "@/domain/errors";
import type {
  Category,
  ProductWithMedia,
  Store,
} from "@/domain/types/entities";
import { getPlan, isUnlimited, type PlanId, type PlanLimits } from "@/config/plans";
import { effectivePlanId } from "@/domain/plans/access";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabasePublicClient } from "@/infrastructure/supabase/public-client";
import {
  mapCategory,
  mapImage,
  mapProduct,
  mapStore,
  mapSubscription,
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
import { resolveStorefrontAccess } from "@/lib/store-storefront-access";

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
    .in("status", ["published", "restricted"])
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", error.message);
  if (!data) throw new AppError("NOT_FOUND", "Store not found.");
  const store = mapStore(data);

  const { data: subRow } = await supabase
    .from("subscriptions")
    .select(
      "id, store_id, plan_id, billing_period, status, trial_ends_at, current_period_end, created_at, updated_at",
    )
    .eq("store_id", data.id)
    .maybeSingle();

  let subscription = subRow ? mapSubscription(subRow) : null;

  if (!subscription) {
    const { data: rpcUsable, error: subscriptionError } = await supabase.rpc(
      "is_store_subscription_usable",
      { target_store_id: data.id },
    );
    if (!subscriptionError && rpcUsable === false) {
      subscription = {
        id: "rpc",
        storeId: store.id,
        planId: "trial",
        billingPeriod: "monthly",
        status: "expired",
        trialEndsAt: null,
        currentPeriodEnd: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        createdAt: "",
        updatedAt: "",
      };
    }
  }

  const resolved = resolveStorefrontAccess(store, subscription);
  if (resolved.status !== "published") {
    throw new AppError("NOT_FOUND", "Store not found.");
  }
  return resolved;
}

function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "trial" || value === "basic" || value === "pro";
}

/** Effective plan. An ended trial or paid period is Free, which keeps the badge. */
export const getStorefrontPlanId = cache(async (storeId: string): Promise<PlanId | null> => {
  if (!isSupabaseConfigured()) {
    try {
      const subscription = await getServices().entitlements.getSubscription(storeId);
      return effectivePlanId(subscription);
    } catch {
      return "free";
    }
  }

  const supabase = createSupabasePublicClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan_id, status, trial_ends_at, current_period_end")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data || !isPlanId(data.plan_id)) return "free";
  return effectivePlanId({
    planId: data.plan_id,
    status: data.status,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
  });
});

async function publicLimits(storeId: string): Promise<PlanLimits> {
  const planId = await getStorefrontPlanId(storeId);
  return getPlan(planId ?? "free").limits;
}

async function loadPublicCategories(storeId: string): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return getServices().categories.listPublic(storeId);
  }

  const limits = await publicLimits(storeId);
  const supabase = createSupabasePublicClient();
  let query = supabase
    .from("categories")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: true });
  if (!isUnlimited(limits.maxCategories)) query = query.limit(limits.maxCategories);

  const { data, error } = await query;

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

  const limits = await publicLimits(storeId);
  const supabase = createSupabasePublicClient();
  const capped = !isUnlimited(limits.maxProducts);
  let query = supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order(capped ? "created_at" : "updated_at", { ascending: capped })
    .limit(capped ? limits.maxProducts : (options?.pageSize ?? 96));

  if (options?.featured) {
    query = query.eq("featured", true);
  }

  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL", error.message);
  const products = (data ?? []).map(mapProduct);
  return attachPublicMediaMany(products, limits);
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
  const limits = await publicLimits(storeId);
  if (!(await productWithinPublicCap(supabase, storeId, data.id as string, limits))) {
    throw new AppError("NOT_FOUND", "Product not found.");
  }
  const [product] = await attachPublicMediaMany([mapProduct(data)], limits);
  return product;
}

async function productWithinPublicCap(
  supabase: ReturnType<typeof createSupabasePublicClient>,
  storeId: string,
  productId: string,
  limits: PlanLimits,
): Promise<boolean> {
  if (isUnlimited(limits.maxProducts)) return true;
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .limit(limits.maxProducts);
  if (error) throw new AppError("INTERNAL", error.message);
  return (data ?? []).some((row) => row.id === productId);
}

async function attachPublicMediaMany(
  products: ReturnType<typeof mapProduct>[],
  limits: PlanLimits = getPlan("pro").limits,
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

  const imageLimit = Number.isFinite(limits.maxImagesPerProduct)
    ? limits.maxImagesPerProduct
    : Number.POSITIVE_INFINITY;
  return products.map((product) =>
    withMedia(
      product,
      imageRows
        .filter((image) => image.productId === product.id)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
        .slice(0, imageLimit),
      limits.maxOptionsPerProduct === 0
        ? []
        : variantRows.filter((variant) => variant.productId === product.id),
      product.categoryId ? (categoryMap.get(product.categoryId) ?? null) : null,
    ),
  );
}

async function customerHiddenNow(slug: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    try {
      await getServices().stores.getPublicStoreBySlug(slug);
      return false;
    } catch {
      return true;
    }
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data || data.status !== "published") return true;
  const { data: usable, error: usableError } = await supabase.rpc(
    "is_store_subscription_usable",
    { target_store_id: data.id },
  );
  if (!usableError && usable === false) return true;
  return false;
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
    const store = await getCachedPublicStore(slug);
    // Re-check outside the 60s cache so an expiry freeze and an admin
    // reactivation hide or restore the storefront on the next request.
    if (await customerHiddenNow(slug)) {
      throw new AppError("NOT_FOUND", "Store not found.");
    }
    return store;
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
