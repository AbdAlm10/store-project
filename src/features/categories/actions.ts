"use server";

import { after } from "next/server";
import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";
import type { Category } from "@/domain/types/entities";
import { revalidateStorefrontStore } from "@/lib/revalidate-storefront";

async function storeRef(storeId: string) {
  return getServices().stores.getStoreForOwner(storeId);
}

export async function createCategoryAction(
  storeId: string,
  input: unknown,
): Promise<{ ok: true; category: Category } | { ok: false; error: string }> {
  try {
    const store = await storeRef(storeId);
    const category = await getServices().categories.create(storeId, input);
    after(() => {
      revalidateStorefrontStore(store);
    });
    return { ok: true, category };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function updateCategoryAction(
  storeId: string,
  categoryId: string,
  input: unknown,
): Promise<{ ok: true; category: Category } | { ok: false; error: string }> {
  try {
    const store = await storeRef(storeId);
    const category = await getServices().categories.updateOptions(
      storeId,
      categoryId,
      input,
    );
    after(() => {
      revalidateStorefrontStore(store);
    });
    return { ok: true, category };
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
    after(() => {
      revalidateStorefrontStore(store);
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
