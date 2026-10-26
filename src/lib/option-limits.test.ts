import { describe, expect, it } from "vitest";
import { PLANS } from "@/config/plans";
import {
  countOptionGroups,
  optionGroupLimitMessage,
} from "@/lib/option-limits";

describe("option group limits", () => {
  it("counts groups, not combinations", () => {
    const sizes = ["S", "M", "L"];
    const colors = ["أسود", "أبيض"];
    const variants = sizes.flatMap((size) =>
      colors.map((color) => ({
        options: { مقاس: size, لون: color },
      })),
    );
    expect(variants).toHaveLength(6);
    expect(countOptionGroups(variants)).toBe(2);
    expect(countOptionGroups(variants)).toBeLessThanOrEqual(
      PLANS.basic.limits.maxOptionsPerProduct,
    );
    expect(countOptionGroups(variants)).toBeLessThanOrEqual(
      PLANS.trial.limits.maxOptionsPerProduct,
    );
  });

  it("rejects a fourth group against the Basic cap", () => {
    const variants = [
      { options: { لون: "أسود", مقاس: "M", خامة: "قطن", النمط: "عصري" } },
    ];
    expect(countOptionGroups(variants)).toBe(4);
    expect(countOptionGroups(variants)).toBeGreaterThan(
      PLANS.basic.limits.maxOptionsPerProduct,
    );
  });

  it("ignores blank keys and empty option maps", () => {
    expect(
      countOptionGroups([
        { options: { "  ": "x", لون: "أحمر" } },
        { options: {} },
        { options: null },
      ]),
    ).toBe(1);
  });

  it("explains the cap in Arabic, including the upgrade", () => {
    const message = optionGroupLimitMessage(3);
    expect(message).toContain("3");
    expect(message).toContain("اللون");
    expect(message).toContain("التركيبات");
    expect(message).toContain("Pro");
    expect(message).not.toMatch(/[A-Za-z]{4,}/);
  });
});
