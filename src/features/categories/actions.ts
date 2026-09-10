"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";
import { revalidateStorefrontStore } from "@/lib/revalidate-storefront";

async function storeRef(storeId: string) {
  return getServices().stores.getStoreForOwner(storeId);
}

export async function createCategoryAction(
  storeId: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const store = await storeRef(storeId);
    await getServices().categories.create(storeId, input);
    revalidateStorefrontStore(store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function updateCategoryAction(
  storeId: string,
  categoryId: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const store = await storeRef(storeId);
    await getServices().categories.updateOptions(storeId, categoryId, input);
    revalidateStorefrontStore(store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function deleteCategoryAction(
  storeId: string,
  categoryId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const store = await storeRef(storeId);
    await getServices().categories.delete(storeId, categoryId);
    revalidateStorefrontStore(store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
