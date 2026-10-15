import { AppError } from "@/domain/errors";
import { isEmailVerifiedAuthUser } from "@/lib/auth-callback";

type Identity = { provider?: string | null };

/**
 * Confirmed email, or a Google sign-in. Google accounts are verified by the
 * provider even when a project still has email confirmation turned on.
 * The check itself lives in the OAuth callback helper so providers[] is included.
 */
export function isAuthUserVerified(user: {
  email_confirmed_at?: string | null;
  identities?: Identity[] | null;
  app_metadata?: Record<string, unknown> | null;
}): boolean {
  return isEmailVerifiedAuthUser(user);
}

/**
 * Email/password signup must open /auth/verify until the address is confirmed.
 * A session alone is not enough: Supabase returns one only after confirmation,
 * or immediately when "Confirm email" is turned off (the user is then confirmed).
 */
export function emailSignupNeedsOtp(input: {
  hasSession: boolean;
  user: {
    email_confirmed_at?: string | null;
    identities?: Identity[] | null;
    app_metadata?: Record<string, unknown> | null;
  };
}): boolean {
  return !input.hasSession || !isAuthUserVerified(input.user);
}

const GUARDED_PREFIXES = ["/dashboard", "/admin", "/onboarding"] as const;

/** Unconfirmed sessions may only stay on the OTP page, not the merchant app. */
export function needsEmailVerificationRedirect(
  pathname: string,
  verified: boolean,
): boolean {
  if (verified) return false;
  if (pathname === "/auth/verify" || pathname.startsWith("/auth/verify/")) {
    return false;
  }
  return GUARDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const OTP_AR = {
  wrong: "الرمز غير صحيح. تحقّق من الأرقام وحاول مرة أخرى.",
  expired: "انتهت صلاحية الرمز. اطلب رمزًا جديدًا.",
  tooMany: "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.",
  format: "أدخل الرمز المكوّن من 6 أرقام.",
  storeBlocked: "أكّد بريدك بالرمز المرسل قبل إنشاء المتجر.",
} as const;

export function otpFailureMessage(error: {
  message?: string | null;
  code?: string | null;
}): string {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();
  if (
    code.includes("rate") ||
    code.includes("over_request") ||
    message.includes("too many") ||
    message.includes("rate limit")
  ) {
    return OTP_AR.tooMany;
  }
  if (code === "otp_expired" || message.includes("expired")) {
    return OTP_AR.expired;
  }
  if (
    code.includes("otp") ||
    code.includes("invalid") ||
    message.includes("invalid") ||
    message.includes("token")
  ) {
    return OTP_AR.wrong;
  }
  return OTP_AR.wrong;
}

export function assertEmailConfirmed(user: { emailConfirmed: boolean }): void {
  if (!user.emailConfirmed) {
    throw new AppError("FORBIDDEN", OTP_AR.storeBlocked);
  }
}
