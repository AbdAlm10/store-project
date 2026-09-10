import { describe, expect, it } from "vitest";
import { computeStoreHealth } from "@/domain/rules/store-health";
import type { Store } from "@/domain/types/entities";

const baseStore: Store = {
  id: "store-1",
  ownerId: "user-1",
  name: "Test Store",
  slug: "test-store",
  description: null,
  logoUrl: null,
  coverUrl: null,
  status: "draft",
  currency: "USD",
  phone: null,
  whatsapp: null,
  email: null,
  location: null,
  openingHours: null,
  instagram: null,
  facebook: null,
  telegram: null,
  tiktok: null,
  primaryColor: "#0D9488",
  themeId: "clean",
  themeOverrides: null,
  defaultLocale: "ar",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  publishedAt: null,
  suspendedAt: null,
};

describe("store health", () => {
  it("scores incomplete new stores low", () => {
    const health = computeStoreHealth({
      store: baseStore,
      productCount: 0,
      categoryCount: 0,
    });
    expect(health.percent).toBeLessThan(50);
    expect(health.items.find((item) => item.id === "name")?.done).toBe(true);
    expect(health.items.find((item) => item.id === "product")?.done).toBe(false);
  });

  it("reaches 100% when checklist is complete", () => {
    const health = computeStoreHealth({
      store: {
        ...baseStore,
        description: "Mobile accessories",
        logoUrl: "https://example.com/logo.png",
        whatsapp: "+15550100",
        status: "published",
      },
      productCount: 3,
      categoryCount: 2,
    });
    expect(health.percent).toBe(100);
    expect(health.completed).toBe(health.total);
  });
});
