"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DASHBOARD_PREFETCH_HREFS } from "@/lib/dashboard-cache";

/**
 * Warm the client router cache for every dashboard tab on first paint
 * (Prefetching + Client-side Navigation).
 */
export function DashboardPrefetch() {
  const router = useRouter();

  useEffect(() => {
    for (const href of DASHBOARD_PREFETCH_HREFS) {
      router.prefetch(href);
    }
  }, [router]);

  return null;
}
