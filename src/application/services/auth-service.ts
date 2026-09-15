import { cache } from "react";
import { AppError } from "@/domain/errors";
import type { Profile } from "@/domain/types/entities";
import type { AuthProvider, AuthSession } from "@/application/ports/providers";
import type { UserRepository } from "@/application/ports/repositories";
import { signInSchema, signUpSchema } from "@/validations/schemas";

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
      throw new AppError("UNAUTHORIZED", "Please sign in to continue.");
    }
    const profile = await users.findProfileById(session.user.id);
    if (!profile) {
      throw new AppError("UNAUTHORIZED", "Profile not found.");
    }
    if (profile.suspendedAt) {
      throw new AppError("FORBIDDEN", "This account has been suspended.");
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

  async logout(): Promise<void> {
    await this.auth.signOut();
  }

  async requireSession(): Promise<AuthSession> {
    const session = await cachedSession(this.auth);
    if (!session) {
      throw new AppError("UNAUTHORIZED", "Please sign in to continue.");
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
}
