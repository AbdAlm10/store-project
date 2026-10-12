import { describe, expect, it, vi } from "vitest";
import { resolveThemeTokens } from "@/config/themes";
import { MemoryAuthProvider } from "@/infrastructure/memory/providers";
import {
  decodeSessionCookie,
  encodeSessionCookie,
  MEMORY_SESSION_COOKIE,
} from "@/infrastructure/memory/session-cookie";
import { isAllowedImageUrl, safeHttpOrigin } from "@/lib/http-url";
import { sniffImageType } from "@/lib/image-bytes";
import { postgrestOrIlike } from "@/lib/postgrest-filter";
import { updateStoreSchema } from "@/validations/schemas";

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get(name: string) {
      const value = jar.get(name);
      return value ? { name, value } : undefined;
    },
    set(name: string, value: string) {
      jar.set(name, value);
    },
    delete(name: string) {
      jar.delete(name);
    },
  }),
}));

describe("demo session cookie", () => {
  it("rejects an unsigned payload", () => {
    const forged = Buffer.from(
      JSON.stringify({
        id: "00000000-0000-4000-8000-000000000099",
        email: "admin@yourstore.app",
      }),
    ).toString("base64url");
    expect(decodeSessionCookie(forged)).toBeNull();
    expect(decodeSessionCookie(`${forged}.not-a-signature`)).toBeNull();
  });

  it("round-trips a signed payload", () => {
    const encoded = encodeSessionCookie({
      id: "user-1",
      email: "merchant@example.com",
    });
    expect(decodeSessionCookie(encoded)).toEqual({
      id: "user-1",
      email: "merchant@example.com",
    });
  });

  it("uses the request cookie instead of another user's in-memory session", async () => {
    jar.clear();
    const auth = new MemoryAuthProvider();
    await auth.signIn({ email: "a@example.com", password: "password123" });
    const cookieA = jar.get(MEMORY_SESSION_COOKIE);
    await auth.signIn({ email: "b@example.com", password: "password123" });
    jar.set(MEMORY_SESSION_COOKIE, cookieA ?? "");

    const session = await auth.getSession();
    expect(session?.user.email).toBe("a@example.com");
  });
});

describe("storefront input guards", () => {
  it("quotes search text so PostgREST or() cannot be extended", () => {
    const filter = postgrestOrIlike(
      ["name", "description"],
      'a,id.eq.1)',
    );
    expect(filter).toBe('name.ilike."%a,id.eq.1)%",description.ilike."%a,id.eq.1)%"');
    expect(filter.split('",')).toHaveLength(2);
  });

  it("drops CSS payloads from theme colors", () => {
    const tokens = resolveThemeTokens(undefined, {
      background: "red; background:url(https://evil.test)",
      accent: "#112233",
      logoSize: "999rem",
    });
    expect(tokens.background).toBe("#F7F4EF");
    expect(tokens.accent).toBe("#112233");
    expect(tokens.logoSize).toBe("3rem");
  });

  it("rejects javascript and private-network image URLs", () => {
    expect(isAllowedImageUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedImageUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedImageUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isAllowedImageUrl("data:image/png;base64,aaaa")).toBe(true);
    expect(
      updateStoreSchema.safeParse({ logoUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("rejects non-http request origins", () => {
    expect(safeHttpOrigin("javascript://evil.test")).toBeNull();
    expect(safeHttpOrigin("https://shop.example")).toBe("https://shop.example");
  });

  it("detects PNG bytes even when the client claims another type", () => {
    const png = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(Uint8Array.from([0x3c, 0x73, 0x76, 0x67]))).toBeNull();
  });
});
