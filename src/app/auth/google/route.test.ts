import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, isOAuthPrefetch } from "@/app/auth/google/route";

describe("GET /auth/google", () => {
  it("ignores prefetch and RSC flights so they do not mint a PKCE verifier", async () => {
    const prefetch = new NextRequest("https://shop.example/auth/google", {
      headers: { "next-router-prefetch": "1" },
    });
    const flight = new NextRequest("https://shop.example/auth/google?_rsc=abc", {
      headers: { rsc: "1" },
    });
    expect(isOAuthPrefetch(prefetch)).toBe(true);
    expect(isOAuthPrefetch(flight)).toBe(true);
    expect((await GET(prefetch)).status).toBe(204);
    expect((await GET(flight)).status).toBe(204);
  });

  it("keeps a real document navigation on the OAuth path", async () => {
    const request = new NextRequest("https://shop.example/auth/google");
    expect(isOAuthPrefetch(request)).toBe(false);
    const response = await GET(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?error=oauth");
  });
});
