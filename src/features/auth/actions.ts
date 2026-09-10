"use server";

import { getServices } from "@/infrastructure/container";
import { toUserMessage } from "@/domain/errors";

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
