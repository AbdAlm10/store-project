"use server";

import { after } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { isUnauthenticatedError, toUserMessage } from "@/domain/errors";
import { revalidateStorefrontStore } from "@/lib/revalidate-storefront";

export async function createStoreAction(input: {
  name: string;
  slug: string;
  description?: string;
  currency: string;
  whatsapp?: string;
  defaultLocale?: string;
}): Promise<
  | { ok: true; storeId: string }
  | { ok: false; error: string; unauthenticated?: boolean }
> {
  try {
    const services = getServices();
    const store = await services.stores.createStore(input);
    after(() => {
      revalidateStorefrontStore(store);
    });
    return { ok: true, storeId: store.id };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      error: toUserMessage(error),
      unauthenticated: isUnauthenticatedError(error),
    };
  }
}
