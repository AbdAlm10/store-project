import { cache } from "react";
import { AppError } from "@/domain/errors";
import type { Profile } from "@/domain/types/entities";
import type { AuthProvider, AuthSession } from "@/application/ports/providers";
import type { UserRepository } from "@/application/ports/repositories";
import {
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
  updateProfileSchema,
} from "@/validations/schemas";

/**
 * Request-scoped dedupe: layout + page + service methods often call these
 * multiple times in one RSC render.
 */
const cachedSession = cache(async (auth: AuthProvider) => auth.getSession());

const cachedProfile = cache(
  async (
    auth: AuthProvider,
    users: UserRepository,
  ): Promise<{ session: AuthSession; profile: Profile }> => {
    const session = await cachedSession(auth);
    if (!session) {
      throw new AppError("UNAUTHORIZED", "يجب تسجيل الدخول للمتابعة.");
    }
    const profile = await users.findProfileById(session.user.id);
    if (!profile) {
      throw new AppError("UNAUTHORIZED", "تعذّر العثور على الملف الشخصي.");
    }
    if (profile.suspendedAt) {
      throw new AppError("FORBIDDEN", "تم إيقاف هذا الحساب.");
    }
    return { session, profile };
  },
);

export class AuthService {
  constructor(
    private readonly auth: AuthProvider,
    private readonly users: UserRepository,
  ) {}

  async register(input: unknown): Promise<{ session: AuthSession; profile: Profile }> {
    const data = signUpSchema.parse(input);
    const session = await this.auth.signUp(data);
    const profile = await this.users.upsertProfile({
      id: session.user.id,
      email: session.user.email,
      fullName: data.fullName ?? null,
      avatarUrl: null,
      platformRole: "merchant",
      locale: "ar",
      suspendedAt: null,
    });
    return { session, profile };
  }

  async login(input: unknown): Promise<AuthSession> {
    const data = signInSchema.parse(input);
    return this.auth.signIn(data);
  }

  async startGoogleSignIn(): Promise<{ url: string }> {
    return this.auth.signInWithOAuth("google");
  }

  /**
   * After OAuth (or any authenticated session without a profiles row yet),
   * create the merchant profile from auth metadata.
   */
  async ensureProfile(): Promise<{ session: AuthSession; profile: Profile }> {
    const session = await this.requireSession();
    const existing = await this.users.findProfileById(session.user.id);
    if (existing) {
      if (existing.suspendedAt) {
        throw new AppError("FORBIDDEN", "تم إيقاف هذا الحساب.");
      }
      return { session, profile: existing };
    }
    const profile = await this.users.upsertProfile({
      id: session.user.id,
      email: session.user.email,
      fullName: session.user.fullName ?? null,
      avatarUrl: session.user.avatarUrl ?? null,
      platformRole: "merchant",
      locale: "ar",
      suspendedAt: null,
    });
    return { session, profile };
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
  }

  async requireSession(): Promise<AuthSession> {
    const session = await cachedSession(this.auth);
    if (!session) {
      throw new AppError("UNAUTHORIZED", "يجب تسجيل الدخول للمتابعة.");
    }
    return session;
  }

  async requireProfile(): Promise<{ session: AuthSession; profile: Profile }> {
    return cachedProfile(this.auth, this.users);
  }

  async requireAdmin(): Promise<{ session: AuthSession; profile: Profile }> {
    const result = await this.requireProfile();
    if (result.profile.platformRole !== "admin") {
      throw new AppError("FORBIDDEN", "Admin access required.");
    }
    return result;
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.auth.requestPasswordReset(email);
  }

  async updateProfile(input: unknown): Promise<Profile> {
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new AppError(
        "VALIDATION",
        first?.message ?? "تحقق من الحقول وحاول مرة أخرى.",
      );
    }
    const { profile } = await this.requireProfile();
    return this.users.upsertProfile({
      ...profile,
      fullName: parsed.data.fullName,
    });
  }

  async updatePassword(input: unknown): Promise<void> {
    const parsed = updatePasswordSchema.safeParse(input);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new AppError(
        "VALIDATION",
        first?.message ?? "تحقق من الحقول وحاول مرة أخرى.",
      );
    }
    await this.requireProfile();
    await this.auth.updatePassword(parsed.data.password);
  }
}
