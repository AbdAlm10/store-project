"use server";

import { cookies } from "next/headers";
import { getServices } from "@/infrastructure/container";
import { REFERRAL_COOKIE_NAME } from "@/lib/referrals/cookie";
import {
  enforceRateLimit,
  requestClientIp,
} from "@/infrastructure/rate-limit/enforce";
import { resolveAllowedAppOrigin } from "@/lib/app-origin";
import { AppError, toUserMessage } from "@/domain/errors";
import { OTP_AR } from "@/lib/email-verification";
import { revalidateDashboard } from "@/lib/revalidate-dashboard";
import { revalidateStorefrontStore } from "@/lib/revalidate-storefront";

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<
  | { ok: true; next: "dashboard" | "verify"; email: string }
  | { ok: false; error: string; verifyEmail?: string }
> {
  try {
    const email = String(input.email ?? "").trim().toLowerCase().slice(0, 320);
    await enforceRateLimit("login", `email:${email}`);
    const ip = await requestClientIp();
    if (ip) await enforceRateLimit("login", `ip:${ip}`);
    const services = getServices();
    const session = await services.auth.login(input);
    if (!session.user.emailConfirmed) {
      return { ok: true, next: "verify", email: session.user.email || email };
    }
    return { ok: true, next: "dashboard", email: session.user.email || email };
  } catch (error) {
    const email = String(input.email ?? "").trim().toLowerCase().slice(0, 320);
    if (
      error instanceof AppError &&
      error.details &&
      typeof error.details === "object" &&
      (error.details as { code?: string }).code === "email_not_confirmed"
    ) {
      return { ok: false, error: toUserMessage(error), verifyEmail: email };
    }
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function registerAction(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<
  | { ok: true; next: "onboarding" | "verify"; email: string }
  | { ok: false; error: string }
> {
  try {
    const email = String(input.email ?? "").trim().toLowerCase().slice(0, 320);
    await enforceRateLimit("register", `email:${email}`);
    const ip = await requestClientIp();
    if (ip) await enforceRateLimit("register", `ip:${ip}`);
    const services = getServices();
    const registered = await services.auth.register(input);
    if (registered.status === "verify_email") {
      return { ok: true, next: "verify", email: registered.email };
    }
    try {
      const jar = await cookies();
      const code = jar.get(REFERRAL_COOKIE_NAME)?.value;
      if (code) {
        await services.referrals.attachFromCode(registered.profile.id, code);
        jar.delete(REFERRAL_COOKIE_NAME);
      }
    } catch (error) {
      console.error("referral attach failed", error);
    }
    return { ok: true, next: "onboarding", email: registered.session.user.email };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

async function attachReferral(userId: string): Promise<void> {
  try {
    const jar = await cookies();
    const code = jar.get(REFERRAL_COOKIE_NAME)?.value;
    if (!code) return;
    await getServices().referrals.attachFromCode(userId, code);
    jar.delete(REFERRAL_COOKIE_NAME);
  } catch (error) {
    console.error("referral attach failed", error);
  }
}

export async function verifySignupOtpAction(input: {
  email: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const email = String(input.email ?? "").trim().toLowerCase().slice(0, 320);
    const token = String(input.token ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(token)) {
      return { ok: false, error: OTP_AR.format };
    }
    await enforceRateLimit("otp_verify", `email:${email}`);
    const ip = await requestClientIp();
    if (ip) await enforceRateLimit("otp_verify", `ip:${ip}`);
    const services = getServices();
    const session = await services.auth.verifySignupCode(email, token);
    await attachReferral(session.user.id);
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError && error.code === "RATE_LIMITED") {
      return { ok: false, error: OTP_AR.tooMany };
    }
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function resendSignupOtpAction(input: {
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const email = String(input.email ?? "").trim().toLowerCase().slice(0, 320);
    await enforceRateLimit("otp_resend", `email:${email}`);
    const services = getServices();
    await services.auth.resendSignupCode(email);
    return { ok: true };
  } catch (error) {
    if (error instanceof AppError && error.code === "RATE_LIMITED") {
      return { ok: false, error: OTP_AR.tooMany };
    }
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function googleAuthAction(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  try {
    const services = getServices();
    const { url } = await services.auth.startGoogleSignIn({
      appOrigin: resolveAllowedAppOrigin(),
    });
    return { ok: true, url };
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
