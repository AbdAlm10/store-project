import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/domain/errors";
import { createServices, type AppServices } from "@/infrastructure/container";
import { optionGroupLimitMessage } from "@/lib/option-limits";

const STORE_ID = "00000000-0000-4000-8000-000000000010";
const DESCRIPTION =
  "قميص تجريبي بوصف طويل يكفي عشرة كلمات حتى يقبل الحفظ";

function variantRows(groups: Record<string, string[]>) {
  const entries = Object.entries(groups);
  let combos: Record<string, string>[] = [{}];
  for (const [name, values] of entries) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of values) next.push({ ...combo, [name]: value });
    }
    combos = next;
  }
  return combos.map((options) => ({
    name: Object.values(options).join(" / "),
    options,
    price: null,
    stock: null,
    sku: null,
  }));
}

async function usePlan(services: AppServices, planId: "basic" | "trial" | "free") {
  await services.auth.login({
    email: "merchant@alnoor.demo",
    password: "password123",
  });
  if (planId === "free") {
    await services.entitlements.simulateExpiredPlan(STORE_ID, "free");
    return;
  }
  await services.entitlements.simulateExpiredPlan(STORE_ID, planId);
  const ends = new Date(Date.now() + 86_400_000 * 20).toISOString();
  await services.entitlements.restoreSubscriptionForTest(STORE_ID, ends);
}

describe("product option groups", () => {
  let services: AppServices;

  beforeEach(() => {
    services = createServices();
  });

  it("saves 3 sizes × 2 colors on Basic and keeps every combination", async () => {
    await usePlan(services, "basic");
    const before = await services.products.listForMerchant(STORE_ID, {
      pageSize: 200,
    });
    const variants = variantRows({
      مقاس: ["S", "M", "L"],
      لون: ["أسود", "أبيض"],
    });
    expect(variants).toHaveLength(6);

    const created = await services.products.create(STORE_ID, {
      name: "Shirt With Options",
      description: DESCRIPTION,
      price: 25,
      status: "draft",
      images: [{ url: "https://cdn.example.com/shirt.jpg", alt: "shirt", sortOrder: 0 }],
      variants,
    });

    const page = await services.products.listForMerchant(STORE_ID, {
      pageSize: 200,
    });
    expect(page.total).toBe(before.total + 1);
    const product = page.items.find((item) => item.id === created.id);
    expect(product?.variants).toHaveLength(6);
  });

  it("rejects a fourth group before creating a product", async () => {
    await usePlan(services, "basic");
    const before = await services.products.listForMerchant(STORE_ID, {
      pageSize: 200,
    });
    await expect(
      services.products.create(STORE_ID, {
        name: "Too Many Groups",
        description: DESCRIPTION,
        price: 25,
        status: "draft",
        images: [{ url: "https://cdn.example.com/shirt.jpg", alt: "shirt", sortOrder: 0 }],
        variants: variantRows({
          لون: ["أسود"],
          مقاس: ["M"],
          الخامة: ["قطن"],
          النمط: ["عصري"],
        }),
      }),
    ).rejects.toMatchObject({
      code: "LIMIT_REACHED",
      message: optionGroupLimitMessage(3),
    });
    const after = await services.products.listForMerchant(STORE_ID, {
      pageSize: 200,
    });
    expect(after.total).toBe(before.total);
  });

  it("does not strip saved options when an update exceeds the cap", async () => {
    await usePlan(services, "trial");
    const created = await services.products.create(STORE_ID, {
      name: "Trial Shirt",
      description: DESCRIPTION,
      price: 25,
      status: "draft",
      images: [{ url: "https://cdn.example.com/shirt.jpg", alt: "shirt", sortOrder: 0 }],
      variants: variantRows({
        مقاس: ["S", "M", "L"],
        لون: ["أسود", "أبيض"],
      }),
    });
    const page = await services.products.listForMerchant(STORE_ID, {
      pageSize: 200,
    });
    const saved = page.items.find((item) => item.id === created.id);
    expect(saved?.variants).toHaveLength(6);

    await expect(
      services.products.update(STORE_ID, created.id, {
        variants: variantRows({
          لون: ["أسود"],
          مقاس: ["M"],
          الخامة: ["قطن"],
          النمط: ["عصري"],
        }),
      }),
    ).rejects.toBeInstanceOf(AppError);

    const again = await services.products.listForMerchant(STORE_ID, {
      pageSize: 200,
    });
    const kept = again.items.find((item) => item.id === created.id);
    expect(kept?.variants).toHaveLength(6);
    expect(kept?.name).toBe("Trial Shirt");
  });
});
