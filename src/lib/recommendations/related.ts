import type { ProductWithMedia, Store } from "@/domain/types/entities";
import { getServices } from "@/infrastructure/container";
import { recommendSimilarProducts } from "@/lib/recommendations";
import {
  getCachedPublicCatalog,
} from "@/lib/storefront-data";

export async function getRelatedProducts(
  store: Store,
  product: ProductWithMedia,
  limit = 8,
): Promise<ProductWithMedia[]> {
  const catalog =
    store.status === "published"
      ? await getCachedPublicCatalog(store.id, store.slug)
      : (
          await getServices().products.listPublic(store.id, { pageSize: 96 })
        ).items;

  let popularity: Map<string, number> | undefined;
  try {
    const rows = await getServices().analytics.getPublicProductPopularity(
      store.id,
      30,
      48,
    );
    popularity = new Map(rows.map((row) => [row.productId, row.views]));
  } catch {
    popularity = undefined;
  }

  return recommendSimilarProducts(product, catalog, {
    limit,
    minScore: 0.1,
    popularity,
  }).map((item) => item.product);
}
