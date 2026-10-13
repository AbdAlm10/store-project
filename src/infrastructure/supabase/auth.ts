import type {
  AuthProvider,
  AuthSession,
  OAuthProviderId,
  SignInInput,
  SignUpInput,
  SignUpResult,
} from "@/application/ports/providers";
import { AppError } from "@/domain/errors";
import { AUTH_AR, localizeAuthMessage } from "@/lib/auth-messages";
import {
  emailSignupNeedsOtp,
  isAuthUserVerified,
  otpFailureMessage,
} from "@/lib/email-verification";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { appConfig } from "@/config/app";
import { resolveAllowedAppOrigin } from "@/lib/app-origin";

function appUrl(override?: string) {
  return resolveAllowedAppOrigin(override?.trim() ? override : appConfig.url);
}

function metadataString(
  data: Record<string, unknown> | undefined,
  ...keys: string[]
): string | null {
  if (!data) return null;
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function toSession(user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  identities?: { provider?: string }[] | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown>;
}, accessToken: string): AuthSession {
  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      emailConfirmed: isAuthUserVerified(user),
      fullName: metadataString(
        user.user_metadata,
        "full_name",
        "name",
      ),
      avatarUrl: metadataString(
        user.user_metadata,
        "avatar_url",
        "picture",
      ),
    },
    accessToken,
  };
}

export class SupabaseAuthProvider implements AuthProvider {
  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const supabase = await createSupabaseServerClient();
    const email = input.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName ?? null,
        },
      },
    });
    if (error) {
      throw new AppError("VALIDATION", localizeAuthMessage(error.message));
    }
    if (!data.user) {
      throw new AppError("VALIDATION", AUTH_AR.generic);
    }
    if (
      !data.session ||
      emailSignupNeedsOtp({ hasSession: true, user: data.user })
    ) {
      return { status: "verify_email", email };
    }
    return {
      status: "authenticated",
      session: toSession(data.user, data.session.access_token),
    };
  }

  async verifySignupOtp(input: { email: string; token: string }): Promise<AuthSession> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: input.email.trim().toLowerCase(),
      token: input.token,
      type: "signup",
    });
    if (error || !data.user || !data.session) {
      throw new AppError(
        "VALIDATION",
        otpFailureMessage({
          message: error?.message,
          code: error && "code" in error ? String(error.code) : null,
        }),
      );
    }
    return toSession(data.user, data.session.access_token);
  }

  async resendSignupOtp(email: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
    });
    if (error) {
      throw new AppError(
        "VALIDATION",
        otpFailureMessage({
          message: error.message,
          code: "code" in error ? String(error.code) : null,
        }),
      );
    }
  }

  async signIn(input: SignInInput): Promise<AuthSession> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.user || !data.session) {
      const raw = error?.message ?? "";
      const unconfirmed = raw.toLowerCase().includes("not confirmed");
      throw new AppError(
        "UNAUTHORIZED",
        localizeAuthMessage(
          unconfirmed ? "Email not confirmed" : "Invalid email or password.",
        ),
        unconfirmed ? { details: { code: "email_not_confirmed" } } : undefined,
      );
    }
    return toSession(data.user, data.session.access_token);
  }

  async signInWithOAuth(
    provider: OAuthProviderId,
    options?: { appOrigin?: string },
  ): Promise<{ url: string }> {
    const supabase = await createSupabaseServerClient();
    const origin = appUrl(options?.appOrigin);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      throw new AppError(
        "VALIDATION",
        localizeAuthMessage(error?.message ?? "Something went wrong. Please try again."),
      );
    }
    return { url: data.url };
  }

  async signOut(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  async getSession(): Promise<AuthSession | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return toSession(data.user, "");
  }

  async requestPasswordReset(email: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const redirectTo = `${appUrl()}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      throw new AppError("VALIDATION", localizeAuthMessage(error.message));
    }
  }

  async updatePassword(password: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    // Prefer getUser() so the JWT is validated/refreshed before updateUser.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new AppError("UNAUTHORIZED", AUTH_AR.signInRequired);
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new AppError("VALIDATION", localizeAuthMessage(error.message));
    }
  }
}
