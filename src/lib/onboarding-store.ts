const READY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A store the merchant finished creating. Blank rows are not a store yet. */
export function isReadyStore(store: { name: string; slug: string }): boolean {
  const name = store.name.trim();
  const slug = store.slug.trim();
  return name.length >= 2 && READY_SLUG.test(slug);
}

export function readyStores<T extends { name: string; slug: string }>(stores: T[]): T[] {
  return stores.filter(isReadyStore);
}
