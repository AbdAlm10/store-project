"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";
import { revalidateStorefrontStore } from "@/lib/revalidate-storefront";

export async function updateStoreAction(
  storeId: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const store = await getServices().stores.updateStore(storeId, input);
    revalidateStorefrontStore(store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
