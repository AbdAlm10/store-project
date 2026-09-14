"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";
import { revalidateStorefrontStore } from "@/lib/revalidate-storefront";

export async function updateStoreAction(
  storeId: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const services = getServices();
    const existing = await services.stores.getStoreForOwner(storeId);
    const store = await services.stores.updateStore(storeId, input);

    const patch =
      input && typeof input === "object"
        ? (input as Record<string, unknown>)
        : {};

    if ("logoUrl" in patch && existing.logoUrl && existing.logoUrl !== store.logoUrl) {
      await services.media.deleteOwnedPublicUrl(storeId, existing.logoUrl);
    }
    if (
      "coverUrl" in patch &&
      existing.coverUrl &&
      existing.coverUrl !== store.coverUrl
    ) {
      await services.media.deleteOwnedPublicUrl(storeId, existing.coverUrl);
    }

    revalidateStorefrontStore(store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
