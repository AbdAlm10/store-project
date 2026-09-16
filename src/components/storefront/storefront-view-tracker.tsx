"use client";

import { trackAnalyticsEvent } from "@/lib/analytics/client-track";
import { useEffect } from "react";

/** Records a unique-capable page view from the browser. */
export function StorefrontViewTracker({
  storeId,
  productId,
  eventType,
  path,
  source,
}: {
  storeId: string;
  productId?: string | null;
  eventType: "store_view" | "product_view";
  path: string;
  source?: string | null;
}) {
  useEffect(() => {
    const dedupeKey = `ys_view_${eventType}_${storeId}_${productId ?? "store"}_${path}`;
    try {
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, "1");
    } catch {
      /* private mode */
    }
    trackAnalyticsEvent({
      storeId,
      productId: productId ?? null,
      eventType,
      path,
      source: source ?? null,
    });
  }, [storeId, productId, eventType, path, source]);

  return null;
}
