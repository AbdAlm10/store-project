import type {
  AuthProvider,
  AuthSession,
  SignInInput,
  SignUpInput,
} from "@/application/ports/providers";
import { AppError } from "@/domain/errors";
import { AUTH_AR, localizeAuthMessage } from "@/lib/auth-messages";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

function toSession(user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
}, accessToken: string): AuthSession {
  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      emailConfirmed: Boolean(user.email_confirmed_at),
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
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`;
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
