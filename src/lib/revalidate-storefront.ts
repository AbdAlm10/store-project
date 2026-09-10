import { revalidatePath, updateTag } from "next/cache";
import {
  storeCategoriesTag,
  storeIdTag,
  storeProductsTag,
  storeTag,
} from "@/lib/cache-tags";

type StoreRef = { id: string; slug: string };

/**
 * Invalidate storefront caches after merchant mutations (Server Actions).
 * updateTag = immediate (read-your-own-writes); revalidatePath refreshes RSC trees.
 */
export function revalidateStorefrontStore(store: StoreRef): void {
  updateTag(storeTag(store.slug));
  updateTag(storeProductsTag(store.slug));
  updateTag(storeCategoriesTag(store.slug));
  updateTag(storeIdTag(store.id));
  updateTag("stores");

  revalidatePath(`/${store.slug}`);
  revalidatePath(`/${store.slug}`, "layout");
}

export function revalidateStorefrontProduct(
  store: StoreRef,
  productSlug: string,
): void {
  revalidateStorefrontStore(store);
  updateTag(`product:${store.slug}:${productSlug}`);
  revalidatePath(`/${store.slug}/products/${productSlug}`);
}
