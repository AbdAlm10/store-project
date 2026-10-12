import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServices } from "@/infrastructure/container";
import { MemoryAuthProvider } from "@/infrastructure/memory/providers";
import {
  hashPassword,
  verifyPassword,
} from "@/infrastructure/memory/password";
import { MemoryRateLimiter } from "@/infrastructure/rate-limit/memory-rate-limiter";
import { createRateLimiter } from "@/infrastructure/rate-limit/enforce";
import { UpstashRateLimiter } from "@/infrastructure/rate-limit/upstash-rate-limiter";
import { assertProductionDataPlane } from "@/infrastructure/runtime-guard";
import { subscriptionTestActionsEnabled } from "@/features/dashboard/subscription-test-actions";
import { buildSecurityHeaders } from "@/lib/content-security-policy";
import { resolveAllowedAppOrigin } from "@/lib/app-origin";

const STORE_ID = "00000000-0000-4000-8000-000000000010";

describe("demo passwords", () => {
  it("rejects an unknown email and a wrong password", async () => {
    const auth = new MemoryAuthProvider();
    await expect(
      auth.signIn({ email: "nobody@example.com", password: "password123" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      auth.signIn({
        email: "merchant@alnoor.demo",
        password: "not-the-demo-password",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("accepts the demo password hash", async () => {
    const auth = new MemoryAuthProvider();
    const session = await auth.signIn({
      email: "merchant@alnoor.demo",
      password: "password123",
    });
    expect(session.user.id).toBe("00000000-0000-4000-8000-000000000001");
    const stored = hashPassword("password123");
    expect(verifyPassword("password123", stored)).toBe(true);
    expect(verifyPassword("other-password", stored)).toBe(false);
  });
});

describe("oauth origin allowlist", () => {
  it("ignores an origin that is not configured", () => {
    const env = {
      ...process.env,
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://shop.example",
      OAUTH_ALLOWED_ORIGINS: "https://preview.example",
    } as NodeJS.ProcessEnv;
    expect(resolveAllowedAppOrigin("https://evil.example", env)).toBe(
      "https://shop.example",
    );
    expect(resolveAllowedAppOrigin("https://preview.example", env)).toBe(
      "https://preview.example",
    );
    expect(resolveAllowedAppOrigin("http://169.254.169.254", env)).toBe(
      "https://shop.example",
    );
  });
});

describe("production data plane", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed in production without Supabase unless the demo flag is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", "");
    vi.stubEnv("NEXT_PHASE", "");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("ENABLE_DEMO_MODE", "");
    expect(() => assertProductionDataPlane()).toThrow(/SUPABASE_URL/);

    vi.stubEnv("ENABLE_DEMO_MODE", "true");
    expect(() => assertProductionDataPlane()).not.toThrow();

    vi.stubEnv("ENABLE_DEMO_MODE", "");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    expect(() => assertProductionDataPlane()).not.toThrow();
  });
});

describe("analytics track checks", () => {
  it("rejects a missing store and a product from another store", async () => {
    const services = createServices();
    await expect(
      services.analytics.track({
        storeId: "00000000-0000-4000-8000-000000000099",
        eventType: "store_view",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      services.analytics.track({
        storeId: STORE_ID,
        productId: "00000000-0000-4000-8000-000000009999",
        eventType: "product_view",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    await expect(
      services.analytics.track({
        storeId: STORE_ID,
        eventType: "store_view",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("rate limiter selection", () => {
  it("uses memory without Upstash env and Upstash when both vars are set", () => {
    expect(
      createRateLimiter({ ...process.env, UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "" }),
    ).toBeInstanceOf(MemoryRateLimiter);
    expect(
      createRateLimiter({
        ...process.env,
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "token",
      }),
    ).toBeInstanceOf(UpstashRateLimiter);
  });
});

describe("subscription test gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires the explicit flag and a non-production process", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENABLE_SUBSCRIPTION_TEST_ACTIONS", "");
    expect(subscriptionTestActionsEnabled()).toBe(false);
    vi.stubEnv("ENABLE_SUBSCRIPTION_TEST_ACTIONS", "true");
    expect(subscriptionTestActionsEnabled()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(subscriptionTestActionsEnabled()).toBe(false);
  });
});

describe("response headers", () => {
  it("sends CSP always and HSTS only for an https production origin", () => {
    const dev = buildSecurityHeaders({
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
    expect(dev.some((header) => header.key === "Content-Security-Policy")).toBe(
      true,
    );
    expect(dev.some((header) => header.key === "Strict-Transport-Security")).toBe(
      false,
    );
    const prod = buildSecurityHeaders({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://shop.example",
    });
    expect(
      prod.find((header) => header.key === "Strict-Transport-Security")?.value,
    ).toContain("max-age=");
    expect(
      prod.find((header) => header.key === "Content-Security-Policy")?.value,
    ).toContain("script-src 'self'");
  });
});

describe("migration intent", () => {
  const root = path.join(process.cwd(), "supabase", "migrations");

  it("locks platform_role and tenant reads in the init migration", () => {
    const sql = readFileSync(
      path.join(root, "20260908000000_init.sql"),
      "utf8",
    );
    expect(sql).toContain("protect_profile_privileges");
    expect(sql).toContain("new.platform_role := 'merchant'");
    expect(sql).toContain("new.platform_role := old.platform_role");
    expect(sql).toContain("revoke update (platform_role, suspended_at)");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("is_store_member");
    expect(sql).toContain("theme_overrides");
    expect(sql).not.toContain("sender = 'system'");
  });

  it("drops the user insert policy for system support replies", () => {
    const sql = readFileSync(
      path.join(root, "20260930000000_support_system_sender.sql"),
      "utf8",
    );
    expect(sql).toContain("support_messages_insert_system_own");
  });

  it("keeps pasted migrations in one piece and safe to repeat", () => {
    const files = [
      "20260908000000_init.sql",
      "20260920000000_support_messages.sql",
      "20260929000000_subscription_billing_period.sql",
      "20260930000000_support_system_sender.sql",
      "20261012000000_referrals.sql",
      "20261013000000_product_client_request_id.sql",
    ];
    const combined = files
      .map((file) => readFileSync(path.join(root, file), "utf8"))
      .join("\n");
    const applyAll = readFileSync(
      path.join(process.cwd(), "supabase", "apply_all.sql"),
      "utf8",
    );
    expect(combined).not.toMatch(/\$\$/);
    expect(applyAll).not.toMatch(/\$\$/);
    expect(applyAll).not.toContain("$policy$");
    expect((combined.match(/\$fn\$/g) ?? []).length % 2).toBe(0);
    expect(combined).not.toMatch(/\$\$\s*begin/);
    expect(combined).toContain("alter extension pgcrypto set schema extensions");
    expect(combined).toContain("drop policy if exists");
    expect(combined).toContain("create or replace function");
    expect(combined).toContain("drop function if exists");
    expect(combined).toContain("add column if not exists");
    expect(applyAll).toMatch(/\nbegin;\n/);
    expect(applyAll.trim().endsWith("commit;")).toBe(true);
    let cursor = 0;
    for (const file of files) {
      const at = applyAll.indexOf(file, cursor);
      expect(at).toBeGreaterThanOrEqual(0);
      cursor = at + file.length;
    }
  });

  it("does not wildcard private image hosts", () => {
    const config = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).not.toContain('hostname: "**"');
    expect(config).not.toContain('protocol: "http"');
    expect(config).toContain('protocol: "https"');
  });
});
