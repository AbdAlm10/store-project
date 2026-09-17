import { cookies } from "next/headers";
import type {
  AuthProvider,
  AuthSession,
  EmailProvider,
  PaymentProvider,
  StorageProvider,
  UploadedObject,
} from "@/application/ports/providers";
import { AppError } from "@/domain/errors";
import { findMemoryProfileByEmail } from "@/infrastructure/memory/repositories";

const MEMORY_SESSION_COOKIE = "ys_memory_session";

type CookiePayload = { id: string; email: string };

async function writeSessionCookie(session: AuthSession): Promise<void> {
  try {
    const jar = await cookies();
    const payload: CookiePayload = {
      id: session.user.id,
      email: session.user.email,
    };
    jar.set(MEMORY_SESSION_COOKIE, JSON.stringify(payload), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    // Outside a Next.js request (e.g. unit tests) — in-memory only.
  }
}

async function clearSessionCookie(): Promise<void> {
  try {
    const jar = await cookies();
    jar.delete(MEMORY_SESSION_COOKIE);
  } catch {
    // ignore
  }
}

async function readSessionCookie(): Promise<AuthSession | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(MEMORY_SESSION_COOKIE)?.value;
    if (!raw) return null;
    const data = JSON.parse(raw) as CookiePayload;
    if (!data?.id || !data?.email) return null;
    return {
      user: {
        id: data.id,
        email: data.email,
        emailConfirmed: true,
      },
      accessToken: "memory-access-token",
    };
  } catch {
    return null;
  }
}

/**
 * Local/dev auth adapter. Replace with SupabaseAuthAdapter in production.
 * Session is kept in-memory and mirrored to an httpOnly cookie so storefront
 * preview works across tabs/refreshes while still on memory mode.
 */
export class MemoryAuthProvider implements AuthProvider {
  private session: AuthSession | null = null;

  async signUp(input: {
    email: string;
    password: string;
    fullName?: string;
  }): Promise<AuthSession> {
    if (input.password.length < 8) {
      throw new AppError(
        "VALIDATION",
        "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
      );
    }
    this.session = {
      user: {
        id: crypto.randomUUID(),
        email: input.email.toLowerCase(),
        emailConfirmed: true,
      },
      accessToken: "memory-access-token",
    };
    await writeSessionCookie(this.session);
    return this.session;
  }

  async signIn(input: { email: string; password: string }): Promise<AuthSession> {
    if (!input.password) {
      throw new AppError(
        "UNAUTHORIZED",
        "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      );
    }
    const email = input.email.toLowerCase();
    const demoIds: Record<string, string> = {
      "merchant@alnoor.demo": "00000000-0000-4000-8000-000000000001",
      "admin@yourstore.app": "00000000-0000-4000-8000-000000000099",
    };

    let userId: string | undefined = demoIds[email];
    if (!userId) {
      userId = findMemoryProfileByEmail(email)?.id;
    }
    if (!userId) {
      userId = crypto.randomUUID();
    }

    this.session = {
      user: {
        id: userId,
        email,
        emailConfirmed: true,
      },
      accessToken: "memory-access-token",
    };
    await writeSessionCookie(this.session);
    return this.session;
  }

  async signOut(): Promise<void> {
    this.session = null;
    await clearSessionCookie();
  }

  async getSession(): Promise<AuthSession | null> {
    if (this.session) return this.session;
    this.session = await readSessionCookie();
    return this.session;
  }

  async requestPasswordReset(): Promise<void> {
    return;
  }

  async updatePassword(password: string): Promise<void> {
    if (password.length < 8) {
      throw new AppError(
        "VALIDATION",
        "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
      );
    }
    if (password.length > 72) {
      throw new AppError("VALIDATION", "كلمة المرور طويلة جدًا.");
    }
  }
}

async function toBuffer(
  data: ArrayBuffer | Buffer | Blob,
): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Blob) return Buffer.from(await data.arrayBuffer());
  return Buffer.from(data);
}

export class MemoryStorageProvider implements StorageProvider {
  getPublicUrl(path: string): string {
    return `https://placehold.co/800x800/0f172a/e2e8f0/png?text=${encodeURIComponent(path.split("/").pop() ?? "image")}`;
  }

  async upload(input: {
    storeId: string;
    folder: "products" | "stores" | "avatars" | "categories";
    fileName: string;
    contentType: string;
    data: ArrayBuffer | Buffer | Blob;
  }): Promise<UploadedObject> {
    const path = `stores/${input.storeId}/${input.folder}/${Date.now()}-${input.fileName}`;
    const buffer = await toBuffer(input.data);
    // Demo mode: keep the compressed bytes as a data URL so uploads work without Supabase.
    const url = `data:${input.contentType};base64,${buffer.toString("base64")}`;
    return {
      path,
      url,
      contentType: input.contentType,
      size: buffer.byteLength,
    };
  }

  async delete(): Promise<void> {
    return;
  }
}

export class NoopEmailProvider implements EmailProvider {
  async send(): Promise<void> {
    return;
  }
}

export class StubPaymentProvider implements PaymentProvider {
  async createCheckoutSession(input: {
    storeId: string;
    planId: "basic" | "pro";
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    return {
      sessionId: `stub_${input.storeId}_${input.planId}`,
      url: `${input.successUrl}?stub=1&plan=${input.planId}`,
    };
  }

  async cancelSubscription(): Promise<void> {
    return;
  }

  async constructWebhookEvent(): Promise<unknown> {
    return {};
  }
}
