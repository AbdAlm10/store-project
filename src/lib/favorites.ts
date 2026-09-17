const STORAGE_PREFIX = "ys:favorites:";

function storageKey(storeSlug: string): string {
  return `${STORAGE_PREFIX}${storeSlug}`;
}

export function readFavorites(storeSlug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(storeSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function writeFavorites(storeSlug: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(storeSlug), JSON.stringify(ids));
  window.dispatchEvent(
    new CustomEvent("ys:favorites-change", {
      detail: { storeSlug, ids },
    }),
  );
}

/** Drop favorite IDs that no longer exist in the catalog (deleted products). */
export function pruneFavorites(
  storeSlug: string,
  validIds: Iterable<string>,
): string[] {
  const allowed = new Set(validIds);
  const current = readFavorites(storeSlug);
  const next = current.filter((id) => allowed.has(id));
  if (next.length !== current.length) {
    writeFavorites(storeSlug, next);
  }
  return next;
}

export function isFavorite(storeSlug: string, productId: string): boolean {
  return readFavorites(storeSlug).includes(productId);
}

export function toggleFavorite(storeSlug: string, productId: string): boolean {
  const current = readFavorites(storeSlug);
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  writeFavorites(storeSlug, next);
  return next.includes(productId);
}
