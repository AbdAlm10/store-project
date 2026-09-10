"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";
import { revalidateStorefrontStore } from "@/lib/revalidate-storefront";

export async function createStoreAction(input: {
  name: string;
  slug: string;
  description?: string;
  currency: string;
  whatsapp?: string;
  defaultLocale?: string;
}): Promise<{ ok: true; storeId: string } | { ok: false; error: string }> {
  try {
    const services = getServices();
    const store = await services.stores.createStore(input);
    revalidateStorefrontStore(store);
    return { ok: true, storeId: store.id };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
