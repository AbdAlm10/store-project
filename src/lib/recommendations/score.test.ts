import { describe, expect, it } from "vitest";
import type { ProductWithMedia } from "@/domain/types/entities";
import { recommendSimilarProducts } from "@/lib/recommendations";

function product(
  partial: Partial<ProductWithMedia> & Pick<ProductWithMedia, "id" | "name">,
): ProductWithMedia {
  return {
    storeId: "store-1",
    categoryId: null,
    slug: partial.slug ?? partial.id,
    description: null,
    price: 100,
    compareAtPrice: null,
    currency: "USD",
    stock: 5,
    status: "published",
    tags: [],
    specifications: {},
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    images: [],
    variants: [],
    category: null,
    ...partial,
  };
}

describe("recommendSimilarProducts", () => {
  it("ranks same-category + similar text above unrelated products", () => {
    const seed = product({
      id: "p1",
      name: "ساعة ذكية رياضية",
      description: "ساعة لياقة مع قياس نبض ومقاومة للماء",
      categoryId: "watches",
      tags: ["ساعة", "رياضة"],
      price: 200,
      category: {
        id: "watches",
        storeId: "store-1",
        name: "ساعات",
        slug: "watches",
        sortOrder: 1,
        imageUrl: null,
        icon: null,
        optionSchema: [],
        createdAt: "",
        updatedAt: "",
      },
    });

    const similar = product({
      id: "p2",
      name: "ساعة ذكية للياقة",
      description: "تتبع النبض والخطوات مقاومة للماء",
      categoryId: "watches",
      tags: ["ساعة", "رياضة"],
      price: 180,
      category: seed.category,
    });

    const distant = product({
      id: "p3",
      name: "حقيبة جلدية",
      description: "حقيبة يد كلاسيكية",
      categoryId: "bags",
      tags: ["حقيبة"],
      price: 50,
    });

    const ranked = recommendSimilarProducts(seed, [similar, distant], {
      limit: 5,
      minScore: 0.05,
    });

    expect(ranked[0]?.product.id).toBe("p2");
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it("excludes the seed product", () => {
    const seed = product({ id: "seed", name: "منتج أ" });
    const other = product({ id: "other", name: "منتج ب", categoryId: "c1" });
    const ranked = recommendSimilarProducts(seed, [seed, other], {
      minScore: 0,
    });
    expect(ranked.every((item) => item.product.id !== "seed")).toBe(true);
  });
});
