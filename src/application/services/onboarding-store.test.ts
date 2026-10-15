import { describe, expect, it } from "vitest";
import { createServices } from "@/infrastructure/container";
import { MemoryStoreRepository } from "@/infrastructure/memory/repositories";
import type { Store } from "@/domain/types/entities";

function blankStore(ownerId: string): Omit<Store, "createdAt" | "updatedAt"> {
  return {
    id: crypto.randomUUID(),
    ownerId,
    name: " ",
    slug: " ",
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
    primaryColor: "#58A379",
    themeId: "clean",
    themeOverrides: null,
    defaultLocale: "ar",
    publishedAt: null,
    suspendedAt: null,
  };
}

describe("onboarding creates one store on submit", () => {
  it("does not write a store until the payload is valid, then fills a blank row once", async () => {
    const services = createServices();
    const email = `owner-${crypto.randomUUID()}@example.com`;
    const registered = await services.auth.register({
      email,
      password: "password123",
      fullName: "Owner",
    });
    if (registered.status !== "authenticated") {
      throw new Error("memory signup should be confirmed");
    }
    const userId = registered.session.user.id;
    const repo = new MemoryStoreRepository();
    await repo.create(blankStore(userId));

    expect(await services.stores.listMyStores()).toEqual([]);
    const before = await repo.listByUserId(userId);
    expect(before).toHaveLength(1);

    await expect(
      services.stores.createStore({ name: " ", slug: "", currency: "USD" }),
    ).rejects.toThrow();
    expect(await repo.listByUserId(userId)).toHaveLength(1);
    expect((await repo.listByUserId(userId))[0]?.name).toBe(" ");

    await expect(
      services.stores.createStore({
        name: "Noon Shop",
        slug: "noon-shop",
        currency: "USD",
        whatsapp: "+12",
      }),
    ).rejects.toThrow(/رمز الدولة/);
    expect((await repo.listByUserId(userId))[0]?.whatsapp).toBeNull();
    expect((await repo.listByUserId(userId))[0]?.name).toBe(" ");

    const store = await services.stores.createStore({
      name: "Noon Shop",
      slug: "noon-shop",
      currency: "USD",
      whatsapp: "+14155552671",
    });
    const owned = await repo.listByUserId(userId);
    expect(owned).toHaveLength(1);
    expect(owned[0]?.id).toBe(store.id);
    expect(owned[0]?.name).toBe("Noon Shop");
    expect(owned[0]?.slug).toBe("noon-shop");
    expect(await services.stores.listMyStores()).toHaveLength(1);

    await expect(
      services.stores.createStore({
        name: "Second Shop",
        slug: "second-shop",
        currency: "USD",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await repo.listByUserId(userId)).toHaveLength(1);
  });
});
