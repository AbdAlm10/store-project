import { describe, expect, it } from "vitest";
import { EARLY_BIRD_SLOT_LIMIT } from "@/config/plans";
import {
  activationCharge,
  reduceClaim,
  type EarlyBirdCounter,
  type EarlyBirdGrant,
} from "@/domain/billing/early-bird";

const NOW = "2026-06-01T00:00:00.000Z";

function empty(): EarlyBirdCounter {
  return { nextSlot: 1, grants: [] };
}

describe("early-bird slot claim", () => {
  it("assigns slots in order and is idempotent per merchant", () => {
    const first = reduceClaim(empty(), {
      userId: "merchant-a",
      storeId: "store-a",
      now: NOW,
    });
    expect(first.result).toEqual({
      eligible: true,
      slotNumber: 1,
      alreadyClaimed: false,
    });

    const again = reduceClaim(first.state, {
      userId: "merchant-a",
      storeId: "store-a",
      now: NOW,
    });
    expect(again.state.nextSlot).toBe(2);
    expect(again.result).toEqual({
      eligible: true,
      slotNumber: 1,
      alreadyClaimed: true,
    });

    const second = reduceClaim(again.state, {
      userId: "merchant-b",
      storeId: "store-b",
      now: NOW,
    });
    expect(second.result.slotNumber).toBe(2);
    expect(second.state.nextSlot).toBe(3);
  });

  it("stops after the first 100 merchants", () => {
    let state = empty();
    for (let slot = 1; slot <= EARLY_BIRD_SLOT_LIMIT; slot += 1) {
      const next = reduceClaim(state, {
        userId: `user-${slot}`,
        storeId: `store-${slot}`,
        now: NOW,
      });
      expect(next.result.eligible).toBe(true);
      expect(next.result.slotNumber).toBe(slot);
      state = next.state;
    }
    const overflow = reduceClaim(state, {
      userId: "user-101",
      storeId: "store-101",
      now: NOW,
    });
    expect(overflow.result).toEqual({
      eligible: false,
      slotNumber: null,
      alreadyClaimed: false,
    });
    expect(overflow.state.grants).toHaveLength(100);
    expect(overflow.state.nextSlot).toBe(101);
  });
});

describe("first-year Sham Cash charge", () => {
  const grant: EarlyBirdGrant = {
    userId: "merchant-a",
    storeId: "store-a",
    slotNumber: 4,
    claimedAt: NOW,
    appliedAt: null,
    discountUntil: null,
    planId: null,
    billingPeriod: null,
    chargedAmountUsd: null,
  };
  const now = new Date(NOW);

  it("charges the discounted first year and then the full price", () => {
    const basicYear = activationCharge({
      grant,
      planId: "basic",
      billingPeriod: "yearly",
      now,
    });
    expect(basicYear.amountUsd).toBe(30);
    expect(basicYear.earlyBird).toBe(true);
    expect(Date.parse(basicYear.discountUntil!) - now.getTime()).toBe(
      365 * 24 * 60 * 60 * 1000,
    );

    const proMonth = activationCharge({
      grant,
      planId: "pro",
      billingPeriod: "monthly",
      now,
    });
    expect(proMonth.amountUsd).toBe(6.75);

    const inside = activationCharge({
      grant: { ...grant, discountUntil: basicYear.discountUntil },
      planId: "basic",
      billingPeriod: "monthly",
      now: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    });
    expect(inside.amountUsd).toBe(3);
    expect(inside.discountUntil).toBe(basicYear.discountUntil);

    const after = activationCharge({
      grant: { ...grant, discountUntil: basicYear.discountUntil },
      planId: "basic",
      billingPeriod: "yearly",
      now: new Date(Date.parse(basicYear.discountUntil!)),
    });
    expect(after.earlyBird).toBe(false);
    expect(after.amountUsd).toBe(40);
  });

  it("charges the list price when the merchant has no slot", () => {
    expect(
      activationCharge({
        grant: null,
        planId: "pro",
        billingPeriod: "yearly",
        now,
      }).amountUsd,
    ).toBe(90);
  });
});
