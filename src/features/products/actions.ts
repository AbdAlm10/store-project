"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";
import {
  revalidateStorefrontProduct,
  revalidateStorefrontStore,
} from "@/lib/revalidate-storefront";

export async function createProductAction(
  storeId: string,
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const services = getServices();
    const store = await services.stores.getStoreForOwner(storeId);
    const product = await services.products.create(storeId, input);
    revalidateStorefrontProduct(store, product.slug);
    return { ok: true, id: product.id };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function updateProductAction(
  storeId: string,
  productId: string,
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const services = getServices();
    const store = await services.stores.getStoreForOwner(storeId);
    const product = await services.products.update(storeId, productId, input);
    revalidateStorefrontProduct(store, product.slug);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function deleteProductAction(
  storeId: string,
  productId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const services = getServices();
    const store = await services.stores.getStoreForOwner(storeId);
    await services.products.delete(storeId, productId);
    revalidateStorefrontStore(store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function duplicateProductAction(
  storeId: string,
  productId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const services = getServices();
    const store = await services.stores.getStoreForOwner(storeId);
    const product = await services.products.duplicate(storeId, productId);
    revalidateStorefrontProduct(store, product.slug);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
