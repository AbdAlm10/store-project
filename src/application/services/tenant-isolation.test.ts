import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/domain/errors";
import { createServices, type AppServices } from "@/infrastructure/container";

describe("auth + tenant isolation", () => {
  let services: AppServices;

  beforeEach(() => {
    services = createServices();
  });

  it("rejects unauthenticated dashboard access", async () => {
    await expect(services.stores.listMyStores()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("demo merchant can manage Al Noor store only", async () => {
    await services.auth.login({
      email: "merchant@alnoor.demo",
      password: "password123",
    });

    const stores = await services.stores.listMyStores();
    expect(stores).toHaveLength(1);
    expect(stores[0].slug).toBe("alnoor");

    const products = await services.products.listForMerchant(stores[0].id, {
      pageSize: 5,
    });
    expect(products.total).toBeGreaterThan(0);
  });

  it("blocks product creation for another store without membership", async () => {
    await services.auth.register({
      email: "outsider@example.com",
      password: "password123",
      fullName: "Outsider",
    });

    await expect(
      services.products.create("00000000-0000-4000-8000-000000000010", {
        name: "Hacked product",
        price: 10,
        status: "published",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("enforces unique product slugs within a store", async () => {
    await services.auth.login({
      email: "merchant@alnoor.demo",
      password: "password123",
    });
    const storeId = "00000000-0000-4000-8000-000000000010";

    await expect(
      services.products.create(storeId, {
        name: "Duplicate Clear Case",
        slug: "clear-magsafe-case",
        description:
          "A duplicate clear case used only to assert the slug conflict check.",
        price: 20,
        status: "draft",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("returns the same product when a create is retried with the same request id", async () => {
    await services.auth.login({
      email: "merchant@alnoor.demo",
      password: "password123",
    });
    const storeId = "00000000-0000-4000-8000-000000000010";
    const before = await services.products.listForMerchant(storeId, {
      pageSize: 100,
    });
    const input = {
      name: "Idempotent Case",
      description:
        "A retried save must not insert a second copy of this published product.",
      price: 18,
      status: "published" as const,
      images: [
        {
          url: "https://placehold.co/600x600/png?text=case",
          alt: "case",
          sortOrder: 0,
        },
      ],
      clientRequestId: "req-idempotent-001",
    };

    const first = await services.products.create(storeId, input);
    const second = await services.products.create(storeId, {
      ...input,
      name: "Idempotent Case retry",
    });
    const after = await services.products.listForMerchant(storeId, {
      pageSize: 100,
    });

    expect(second.id).toBe(first.id);
    expect(after.total).toBe(before.total + 1);
  });
});
