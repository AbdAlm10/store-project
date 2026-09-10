/** Cache tags for storefront data (on-demand revalidation). */

export function storeTag(slug: string) {
  return `store:${slug}`;
}

export function storeProductsTag(slug: string) {
  return `store:${slug}:products`;
}

export function storeCategoriesTag(slug: string) {
  return `store:${slug}:categories`;
}

export function storeIdTag(storeId: string) {
  return `store-id:${storeId}`;
}
