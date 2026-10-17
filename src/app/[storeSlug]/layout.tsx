import { StorefrontCart } from "@/components/storefront/storefront-cart";
import { showsDukkanStorefrontBadge } from "@/domain/storefront/badge";
import type { PopularProduct } from "@/features/cart/cart-context";
import { productNeedsOptions } from "@/lib/orders/checkout";
import { isReservedStoreSlug } from "@/lib/reserved-slugs";
import {
  getCachedPublicCatalog,
  getCachedPublicFeatured,
  getCachedStorefront,
  getStorefrontPlanId,
} from "@/lib/storefront-data";
import { notFound } from "next/navigation";

export default async function StoreSlugLayout({
  children,
  params,
}: LayoutProps<"/[storeSlug]">) {
  const { storeSlug } = await params;
  if (isReservedStoreSlug(storeSlug)) notFound();

  let store: Awaited<ReturnType<typeof getCachedStorefront>> | null = null;
  try {
    store = await getCachedStorefront(storeSlug);
  } catch {
    store = null;
  }
  if (!store) notFound();

  let popular: PopularProduct[] = [];
  try {
    const featured = await getCachedPublicFeatured(store.id, store.slug);
    const source =
      featured.length > 0
        ? featured
        : await getCachedPublicCatalog(store.id, store.slug);
    popular = source.slice(0, 6).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      currency: product.currency,
      imageUrl: product.images[0]?.url ?? null,
      hasOptions: productNeedsOptions(product),
    }));
  } catch {
    popular = [];
  }

  let showPromo = true;
  try {
    showPromo = showsDukkanStorefrontBadge(await getStorefrontPlanId(store.id));
  } catch {
    showPromo = true;
  }

  return (
    <StorefrontCart
      store={{
        id: store.id,
        slug: store.slug,
        name: store.name,
        whatsapp: store.whatsapp,
        showPromo,
      }}
      popular={popular}
    >
      {children}
    </StorefrontCart>
  );
}
