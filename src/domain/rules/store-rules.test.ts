import { describe, expect, it } from "vitest";
import { discountPercent, slugify } from "@/domain/rules/store-rules";
import { EntitlementService } from "@/application/services/entitlement-service";
import { MemorySubscriptionRepository } from "@/infrastructure/memory/repositories";
import { AppError } from "@/domain/errors";
import { buildWhatsAppOrderMessage } from "@/lib/social/sharing";
import { createServices } from "@/infrastructure/container";

describe("domain rules", () => {
  it("calculates discount percent", () => {
    expect(discountPercent(80, 100)).toBe(20);
    expect(discountPercent(100, 80)).toBeNull();
  });

  it("slugifies store names", () => {
    expect(slugify("Al Noor Store!")).toBe("al-noor-store");
  });
});

describe("entitlements", () => {
  it("blocks product creation over plan limit", async () => {
    const subscriptions = new MemorySubscriptionRepository();
    const service = new EntitlementService(subscriptions);
    const storeId = "00000000-0000-4000-8000-000000000010";

    await expect(service.assertCanCreateProduct(storeId, 1000)).rejects.toBeInstanceOf(
      AppError,
    );
  });
});

describe("whatsapp ordering", () => {
  it("builds a structured message URL", () => {
    const result = buildWhatsAppOrderMessage({
      store: { name: "Al Noor", whatsapp: "+15550100" },
      product: { name: "Case", price: 24, currency: "USD" },
      storeSlug: "alnoor",
      productSlug: "case",
      quantity: 2,
    });
    expect(result?.url).toContain("wa.me/15550100");
    expect(result?.message).toContain("Quantity: 2");
  });
});

describe("public store catalog", () => {
  it("loads demo store products without auth", async () => {
    const services = createServices();
    const store = await services.stores.getPublicStoreBySlug("alnoor");
    const products = await services.products.listPublic(store.id, { pageSize: 5 });
    expect(store.name).toBe("Al Noor Store");
    expect(products.items.length).toBeGreaterThan(0);
  });
});
