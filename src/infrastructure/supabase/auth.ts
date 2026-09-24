import type {
  AuthProvider,
  AuthSession,
  OAuthProviderId,
  SignInInput,
  SignUpInput,
} from "@/application/ports/providers";
import { AppError } from "@/domain/errors";
import { AUTH_AR, localizeAuthMessage } from "@/lib/auth-messages";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
  user_metadata?: Record<string, unknown>;
}, accessToken: string): AuthSession {
  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      emailConfirmed: Boolean(user.email_confirmed_at),
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
  async signUp(input: SignUpInput): Promise<AuthSession> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
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
    if (!data.user || !data.session) {
      throw new AppError(
        "VALIDATION",
        localizeAuthMessage(
          "Check your email to confirm the account, then sign in.",
        ),
      );
    }
    return toSession(data.user, data.session.access_token);
  }

  async signIn(input: SignInInput): Promise<AuthSession> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.user || !data.session) {
      throw new AppError(
        "UNAUTHORIZED",
        localizeAuthMessage("Invalid email or password."),
      );
    }
    return toSession(data.user, data.session.access_token);
  }

  async signInWithOAuth(provider: OAuthProviderId): Promise<{ url: string }> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${appUrl()}/auth/callback`,
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
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    return toSession(data.session.user, data.session.access_token);
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
