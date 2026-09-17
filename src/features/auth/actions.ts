"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";
import { revalidateDashboard } from "@/lib/revalidate-dashboard";
import { revalidateStorefrontStore } from "@/lib/revalidate-storefront";

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const services = getServices();
    await services.auth.login(input);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function registerAction(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const services = getServices();
    await services.auth.register(input);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function logoutAction(): Promise<void> {
  const services = getServices();
  await services.auth.logout();
}

export async function updateAccountSettingsAction(input: {
  fullName: string;
  storeId: string;
  storeName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const services = getServices();
    await services.auth.updateProfile({ fullName: input.fullName });
    const store = await services.stores.updateStore(input.storeId, {
      name: input.storeName,
    });
    revalidateStorefrontStore(store);
    revalidateDashboard(store.id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function updatePasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const services = getServices();
    await services.auth.updatePassword(input);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
