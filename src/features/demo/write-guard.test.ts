import { beforeEach, describe, expect, it, vi } from "vitest";

const headerGet = vi.hoisted(() => vi.fn((name: string) => (name === "next-url" ? "/demo/dashboard/products" : null)));
const getServices = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: async () => ({ get: headerGet }),
  cookies: async () => ({ get: () => undefined, delete: () => undefined }),
}));

vi.mock("@/infrastructure/container", () => ({
  getServices,
}));

import { createCategoryAction } from "@/features/categories/actions";
import { createProductAction, deleteProductAction, updateProductAction } from "@/features/products/actions";
import { uploadImageAction } from "@/features/media/actions";
import { updateStoreAction } from "@/features/stores/update-actions";
import { updateAccountSettingsAction, logoutAction } from "@/features/auth/actions";
import { sendSupportMessageAction } from "@/features/support/actions";
import {
  DATA_LAYER_WRITE_METHODS,
  executeWrite,
  isDataLayerWriteMethod,
} from "@/features/demo/write-guard";
import { demoDashboardStats, demoOrders } from "@/features/demo/catalog";
import { alnoorCategories, alnoorEvents, alnoorProducts } from "@/features/demo/alnoor-demo";
import { demoSeed } from "@/infrastructure/demo/seed";

describe("demo mode writes", () => {
  beforeEach(() => {
    headerGet.mockImplementation((name: string) =>
      name === "next-url" ? "/demo/dashboard/products" : null,
    );
    getServices.mockReset();
    getServices.mockImplementation(() => {
      throw new Error("data layer called");
    });
  });

  it("never calls data-layer write functions", async () => {
    const writes = Object.fromEntries(
      DATA_LAYER_WRITE_METHODS.map((name) => [name, vi.fn(() => "wrote")]),
    );
    for (const name of DATA_LAYER_WRITE_METHODS) {
      expect(isDataLayerWriteMethod(name)).toBe(true);
      const result = await executeWrite(async () => writes[name]());
      expect(result).toEqual({ ok: false, error: "demo_readonly" });
    }
    for (const write of Object.values(writes)) {
      expect(write).not.toHaveBeenCalled();
    }

    const file = new File(["png"], "photo.png", { type: "image/png" });
    const formData = new FormData();
    formData.set("file", file);
    const results = await Promise.all([
      createProductAction(demoSeed.ids.storeId, { name: "Demo" }),
      updateProductAction(demoSeed.ids.storeId, demoSeed.products[0]!.id, { name: "Demo" }),
      deleteProductAction(demoSeed.ids.storeId, demoSeed.products[0]!.id),
      createCategoryAction(demoSeed.ids.storeId, { name: "Demo" }),
      updateStoreAction(demoSeed.ids.storeId, { name: "Demo" }),
      updateAccountSettingsAction({
        fullName: "Demo",
        storeId: demoSeed.ids.storeId,
        storeName: "Demo",
      }),
      uploadImageAction(demoSeed.ids.storeId, "product", formData),
      sendSupportMessageAction({ body: "hello", storeId: demoSeed.ids.storeId }),
      logoutAction(),
    ]);
    for (const result of results) {
      if (result !== undefined) expect(result).toEqual({ ok: false, error: "demo_readonly" });
    }
    expect(getServices).not.toHaveBeenCalled();
  });

  it("still runs a write outside the demo route", async () => {
    headerGet.mockReturnValue(null);
    const write = vi.fn(async () => "saved");
    await expect(executeWrite(write)).resolves.toBe("saved");
    expect(write).toHaveBeenCalledOnce();
  });
});

describe("demo catalog", () => {
  it("builds Arabic orders and analytics from the النور dataset", () => {
    const orders = demoOrders();
    const first = alnoorProducts.find((product) => product.id === orders[0]?.productId);
    expect(orders[0]).toMatchObject({
      number: "D-1001",
      customerName: "ليلى الحسن",
      governorate: "دمشق",
      productName: first?.name,
      currency: "SYP",
      total: (first?.price ?? 0) * (orders[0]?.quantity ?? 0),
    });
    expect(orders.map((order) => order.number)).toEqual([
      "D-1001",
      "D-1002",
      "D-1003",
      "D-1004",
      "D-1005",
      "D-1006",
    ]);
    expect(orders.map((order) => order.governorate)).toEqual([
      "دمشق",
      "حلب",
      "حمص",
      "اللاذقية",
      "حماة",
      "طرطوس",
    ]);

    for (const category of alnoorCategories) {
      for (const option of category.optionSchema) {
        expect(option.name).not.toMatch(/color|size/i);
        for (const value of option.values) {
          expect(value.label).not.toMatch(/black|white|red|blue|green|beige|color|size/i);
        }
      }
    }

    const now = Date.now();
    const stats = demoDashboardStats(7, now);
    const since = now - 7 * 86_400_000;
    const events = alnoorEvents.filter((event) => Date.parse(event.createdAt) >= since);
    expect(stats.whatsappClicks).toBe(events.filter((event) => event.eventType === "whatsapp_click").length);
    expect(stats.productViews).toBe(events.filter((event) => event.eventType === "product_view").length);
    const visitors = new Set(
      events
        .filter((event) => event.eventType === "store_view" && event.visitorKey)
        .map((event) => event.visitorKey),
    );
    expect(stats.storeViews).toBe(visitors.size);
    if (stats.topProducts[0]) {
      expect(stats.topProducts[0].name).toBe(
        alnoorProducts.find((product) => product.id === stats.topProducts[0]?.productId)?.name,
      );
    }
  });
});
