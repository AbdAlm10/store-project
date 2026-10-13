import { describe, expect, it } from "vitest";
import { AppError } from "@/domain/errors";
import { MemoryRateLimiter } from "@/infrastructure/rate-limit/memory-rate-limiter";
import {
  OTP_AR,
  assertEmailConfirmed,
  isAuthUserVerified,
  needsEmailVerificationRedirect,
  otpFailureMessage,
} from "@/lib/email-verification";

describe("email confirmation", () => {
  it("treats a confirmed address and Google as verified", () => {
    expect(isAuthUserVerified({ email_confirmed_at: null })).toBe(false);
    expect(isAuthUserVerified({ email_confirmed_at: "2026-01-01T00:00:00Z" })).toBe(true);
    expect(
      isAuthUserVerified({
        email_confirmed_at: null,
        identities: [{ provider: "google" }],
      }),
    ).toBe(true);
    expect(
      isAuthUserVerified({
        email_confirmed_at: null,
        app_metadata: { provider: "google" },
      }),
    ).toBe(true);
    expect(
      isAuthUserVerified({
        email_confirmed_at: null,
        identities: [{ provider: "email" }],
      }),
    ).toBe(false);
  });

  it("sends unconfirmed sessions to the OTP page and leaves Google users through", () => {
    expect(needsEmailVerificationRedirect("/dashboard", false)).toBe(true);
    expect(needsEmailVerificationRedirect("/dashboard/products", false)).toBe(true);
    expect(needsEmailVerificationRedirect("/onboarding", false)).toBe(true);
    expect(needsEmailVerificationRedirect("/admin/users", false)).toBe(true);
    expect(needsEmailVerificationRedirect("/auth/verify", false)).toBe(false);
    expect(needsEmailVerificationRedirect("/login", false)).toBe(false);
    expect(needsEmailVerificationRedirect("/dashboard", true)).toBe(false);
  });

  it("maps wrong, expired, and repeated OTP failures", () => {
    expect(otpFailureMessage({ code: "otp_expired", message: "expired" })).toBe(OTP_AR.expired);
    expect(otpFailureMessage({ message: "Token has expired or is invalid" })).toBe(OTP_AR.expired);
    expect(otpFailureMessage({ code: "otp_invalid", message: "invalid token" })).toBe(OTP_AR.wrong);
    expect(otpFailureMessage({ message: "Invalid login credentials" })).toBe(OTP_AR.wrong);
    expect(otpFailureMessage({ code: "over_request_rate_limit", message: "too many" })).toBe(
      OTP_AR.tooMany,
    );
  });

  it("blocks store creation until the email is confirmed", () => {
    expect(() => assertEmailConfirmed({ emailConfirmed: false })).toThrow(AppError);
    expect(() => assertEmailConfirmed({ emailConfirmed: false })).toThrow(OTP_AR.storeBlocked);
    expect(() => assertEmailConfirmed({ emailConfirmed: true })).not.toThrow();
  });

  it("allows one resend per minute for the same email", async () => {
    const limiter = new MemoryRateLimiter();
    const first = await limiter.check("otp_resend", "email:merchant@example.com");
    const second = await limiter.check("otp_resend", "email:merchant@example.com");
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.retryAfterSeconds).toBeGreaterThan(0);
  });
});
