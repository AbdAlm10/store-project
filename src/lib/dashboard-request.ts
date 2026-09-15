import { cache } from "react";
import { getServices } from "@/infrastructure/container";

/** Per-request dedupe for layout + page auth checks. */
export const getDashboardProfile = cache(async () => {
  return getServices().auth.requireProfile();
});

/** Per-request dedupe for layout + page store lookups. */
export const getDashboardStores = cache(async () => {
  return getServices().stores.listMyStores();
});
