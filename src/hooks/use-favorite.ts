"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  isFavorite,
  readFavorites,
  toggleFavorite,
} from "@/lib/favorites";

function subscribe(storeSlug: string, onStoreChange: () => void) {
  function onCustom(event: Event) {
    const detail = (event as CustomEvent<{ storeSlug?: string }>).detail;
    if (detail?.storeSlug && detail.storeSlug !== storeSlug) return;
    onStoreChange();
  }
  function onStorage(event: StorageEvent) {
    if (event.key && event.key !== `ys:favorites:${storeSlug}`) return;
    onStoreChange();
  }
  window.addEventListener("ys:favorites-change", onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("ys:favorites-change", onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavorite(storeSlug: string, productId: string) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const favorited = useSyncExternalStore(
    (onStoreChange) => subscribe(storeSlug, onStoreChange),
    () => isFavorite(storeSlug, productId),
    () => false,
  );

  function toggle() {
    return toggleFavorite(storeSlug, productId);
  }

  return {
    favorited: mounted ? favorited : false,
    toggle,
    /** Avoid hydration flash — only treat as ready after mount. */
    ready: mounted,
    count: mounted ? readFavorites(storeSlug).length : 0,
  };
}
