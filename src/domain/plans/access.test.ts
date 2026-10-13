import { describe, expect, it } from "vitest";
import { PLANS } from "@/config/plans";
import {
  effectivePlanId,
  limitsForSubscription,
  occupiesFreeSlot,
  oldestVisible,
  visibleProductIds,
} from "@/domain/plans/access";
import type { Subscription } from "@/domain/types/entities";

function subscription(patch: Partial<Subscription>): Subscription {
  return {
    id: "sub",
    storeId: "store",
    planId: "trial",
    billingPeriod: "monthly",
    status: "trialing",
    trialEndsAt: "2099-01-01T00:00:00.000Z",
    currentPeriodEnd: "2099-01-01T00:00:00.000Z",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

describe("free tier access", () => {
  it("keeps the trial on Basic and falls back to Free when it ends", () => {
    expect(PLANS.trial.limits).toEqual(PLANS.basic.limits);
    expect(PLANS.basic.limits.maxProducts).toBe(150);
    expect(PLANS.basic.limits.maxImagesPerProduct).toBe(5);
    expect(PLANS.basic.limits.maxCategories).toBe(10);
    expect(PLANS.basic.limits.qr).toBe(true);
    expect(PLANS.basic.limits.showPlatformBadge).toBe(false);
    expect(PLANS.basic.limits.analytics).toBe("engagement");
    expect(PLANS.free.limits).toMatchObject({
      maxProducts: 10,
      maxCategories: 3,
      maxImagesPerProduct: 1,
      maxOptionsPerProduct: 0,
      analytics: "visits",
      themeAccess: "none",
      qr: false,
      showPlatformBadge: true,
    });
    expect(PLANS.pro.limits.maxProducts).toBe(1000);
    expect(PLANS.pro.priceMonthlyUsd).toBe(9);
    expect(PLANS.pro.priceYearlyUsd).toBe(90);

    const live = subscription({});
    expect(effectivePlanId(live)).toBe("trial");
    expect(limitsForSubscription(live).maxProducts).toBe(150);

    const ended = subscription({ trialEndsAt: "2020-01-01T00:00:00.000Z" });
    expect(effectivePlanId(ended)).toBe("free");
    expect(limitsForSubscription(ended).maxProducts).toBe(10);
    expect(occupiesFreeSlot(ended)).toBe(true);
    expect(occupiesFreeSlot(subscription({ planId: "basic", status: "active" }))).toBe(false);
  });

  it("keeps the oldest items visible and hides the rest without dropping them from the input", () => {
    const items = [
      { id: "new", createdAt: "2026-03-01T00:00:00.000Z" },
      { id: "old", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "mid", createdAt: "2026-02-01T00:00:00.000Z" },
    ];
    expect(oldestVisible(items, 2, (item) => item.createdAt).map((item) => item.id)).toEqual([
      "old",
      "mid",
    ]);
    expect(items).toHaveLength(3);
    const visible = visibleProductIds(
      items.map((item) => ({ ...item, status: "published" })),
      1,
    );
    expect([...visible]).toEqual(["old"]);
  });
});
