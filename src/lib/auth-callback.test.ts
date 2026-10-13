import { describe, expect, it } from "vitest";
import {
  isEmailVerifiedAuthUser,
  isGoogleAuthUser,
  loginForwardsOAuthCode,
  oauthFailureUrl,
  postAuthPath,
  skipsAuthRefresh,
} from "@/lib/auth-callback";

describe("oauth callback redirects", () => {
  it("forwards a login code once and stops on the failure URL", () => {
    const returnedToLogin = new URL("https://dukkaan.netlify.app/login?code=pkce-code");
    expect(
      loginForwardsOAuthCode({
        code: returnedToLogin.searchParams.get("code"),
        error: returnedToLogin.searchParams.get("error"),
      }),
    ).toBe(true);

    const failure = new URL(oauthFailureUrl("https://dukkaan.netlify.app"));
    expect(failure.pathname).toBe("/login");
    expect(failure.searchParams.get("error")).toBe("oauth");
    expect(failure.searchParams.has("code")).toBe(false);
    expect(
      loginForwardsOAuthCode({
        code: failure.searchParams.get("code"),
        error: failure.searchParams.get("error"),
      }),
    ).toBe(false);
  });

  it("does not send /onboarding and /dashboard at each other for one result", () => {
    expect(postAuthPath(true)).toBe("/dashboard");
    expect(postAuthPath(false)).toBe("/onboarding");
    expect(postAuthPath(true)).not.toBe(postAuthPath(false));
  });

  it("leaves the OAuth handoff routes out of session refresh", () => {
    expect(skipsAuthRefresh("/auth/callback")).toBe(true);
    expect(skipsAuthRefresh("/auth/google")).toBe(true);
    expect(skipsAuthRefresh("/dashboard")).toBe(false);
    expect(skipsAuthRefresh("/onboarding")).toBe(false);
    expect(skipsAuthRefresh("/login")).toBe(false);
  });
});

describe("Google email verification", () => {
  it("treats a Google identity as verified without email_confirmed_at", () => {
    const user = {
      email_confirmed_at: null,
      app_metadata: { provider: "google", providers: ["google"] },
      identities: [{ provider: "google" }],
    };
    expect(isGoogleAuthUser(user)).toBe(true);
    expect(isEmailVerifiedAuthUser(user)).toBe(true);
  });

  it("accepts a confirmed email and rejects an unconfirmed password user", () => {
    expect(
      isEmailVerifiedAuthUser({
        email_confirmed_at: "2026-01-01T00:00:00Z",
        app_metadata: { provider: "email" },
        identities: [{ provider: "email" }],
      }),
    ).toBe(true);
    expect(
      isEmailVerifiedAuthUser({
        email_confirmed_at: null,
        app_metadata: { provider: "email" },
        identities: [{ provider: "email" }],
      }),
    ).toBe(false);
  });
});
