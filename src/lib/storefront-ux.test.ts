import { describe, expect, it } from "vitest";
import { publicStorePathPrefix } from "@/lib/public-store-prefix";
import type { Category, ProductWithMedia } from "@/domain/types/entities";
import { buildVariantMatrix } from "@/lib/category-options";
import { hasOpeningHours, isLegacyOpeningHoursText } from "@/lib/opening-hours";
import { listedProductStock } from "@/lib/listed-stock";
import { storeInitials } from "@/lib/store-initials";
import { usedFilterValues } from "@/lib/used-filter-values";

describe("storefront merchant fixes", () => {
  it("shows the public host in front of the store slug", () => {
    expect(publicStorePathPrefix("https://dukkaan.netlify.app")).toBe(
      "dukkaan.netlify.app/",
    );
    expect(publicStorePathPrefix("http://localhost:3000/")).toBe(
      "localhost:3000/",
    );
  });

  it("builds store initials and skips a leading Arabic article", () => {
    expect(storeInitials("النور")).toBe("نو");
    expect(storeInitials("متجر النور")).toBe("من");
    expect(storeInitials("Al Noor")).toBe("AN");
    expect(storeInitials("   ")).toBe("د");
  });

  it("sums variant stock for the product list", () => {
    expect(
      listedProductStock({
        stock: null,
        variants: [{ stock: 2 }, { stock: 4 }, { stock: null }],
      }),
    ).toBe(6);
    expect(listedProductStock({ stock: 3, variants: [] })).toBe(3);
    expect(
      listedProductStock({
        stock: 9,
        variants: [{ stock: null }, { stock: null }],
      }),
    ).toBe(9);
  });

  it("treats blank opening hours as unset and keeps a written sentence", () => {
    expect(hasOpeningHours(null)).toBe(false);
    expect(hasOpeningHours("   ")).toBe(false);
    expect(hasOpeningHours('{"version":1,"days":[]}')).toBe(true);
    expect(hasOpeningHours("Sat–Thu 10:00–20:00")).toBe(true);
    expect(isLegacyOpeningHoursText("Sat–Thu 10:00–20:00")).toBe(true);
    expect(isLegacyOpeningHoursText(null)).toBe(false);
  });

  it("offers filters only for values a product variant uses", () => {
    const category = {
      id: "cat-1",
      optionSchema: [
        {
          id: "color",
          name: "اللون",
          kind: "color",
          values: [
            { label: "أسود", hex: "#111827" },
            { label: "أبيض", hex: "#F8FAFC" },
          ],
        },
        {
          id: "size",
          name: "المقاس",
          kind: "text",
          values: [{ label: "S" }, { label: "M" }, { label: "L" }],
        },
      ],
    } as unknown as Category;

    const products = [
      {
        variants: [
          { options: { اللون: "أسود", المقاس: "M" } },
          { options: { اللون: "أسود", المقاس: "L" } },
        ],
      },
    ] as unknown as ProductWithMedia[];

    const filters = usedFilterValues(products, [category]);
    expect(filters.sizes).toEqual(["M", "L"]);
    expect(filters.colors.map((color) => color.label)).toEqual(["أسود"]);
    expect(filters.colors[0]?.hex).toBe("#111827");
    expect(filters.groups).toEqual([]);
  });

  it("generates only the variant combinations the merchant selected", () => {
    const colors = ["Black", "White", "Red", "Blue", "Green", "Beige"].map(
      (label) => ({ label }),
    );
    const sizes = ["XS", "S", "M", "L", "XL", "XXL"].map((label) => ({
      label,
    }));
    const schema = [
      { id: "color", name: "Color", kind: "color" as const, values: colors },
      { id: "size", name: "Size", kind: "text" as const, values: sizes },
    ];
    expect(buildVariantMatrix(schema)).toHaveLength(36);

    const selected = {
      Color: ["Black", "White"],
      Size: ["M"],
    };
    const narrowed = schema.map((option) => ({
      ...option,
      values: option.values.filter((value) =>
        selected[option.name as "Color" | "Size"].includes(value.label),
      ),
    }));
    const matrix = buildVariantMatrix(narrowed);
    expect(matrix).toHaveLength(2);
    expect(matrix.map((item) => item.name).sort()).toEqual([
      "Black / M",
      "White / M",
    ]);
  });
});
