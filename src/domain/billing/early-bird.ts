import {
  EARLY_BIRD_SLOT_LIMIT,
  earlyBirdPrice,
  planPrice,
  PLANS,
  type BillingPeriod,
} from "@/config/plans";
import { PAID_YEAR_DAYS } from "@/domain/billing/period";

export type EarlyBirdGrant = {
  userId: string;
  storeId: string;
  slotNumber: number;
  claimedAt: string;
  appliedAt: string | null;
  /** End of the discounted first paid year. Null until the first paid activation. */
  discountUntil: string | null;
  planId: "basic" | "pro" | null;
  billingPeriod: BillingPeriod | null;
  chargedAmountUsd: number | null;
};

export type EarlyBirdClaimResult = {
  eligible: boolean;
  slotNumber: number | null;
  alreadyClaimed: boolean;
};

export type EarlyBirdCounter = {
  nextSlot: number;
  grants: EarlyBirdGrant[];
};

/**
 * Pure claim reducer. The database function is the race-safe production path;
 * this mirrors its rules so tests can lock idempotency and the 100 cap.
 */
export function reduceClaim(
  state: EarlyBirdCounter,
  input: { userId: string; storeId: string; now: string; limit?: number },
): { state: EarlyBirdCounter; result: EarlyBirdClaimResult } {
  const limit = input.limit ?? EARLY_BIRD_SLOT_LIMIT;
  const existing = state.grants.find((grant) => grant.userId === input.userId);
  if (existing) {
    return {
      state,
      result: {
        eligible: true,
        slotNumber: existing.slotNumber,
        alreadyClaimed: true,
      },
    };
  }
  const storeGrant = state.grants.find((grant) => grant.storeId === input.storeId);
  if (storeGrant) {
    return {
      state,
      result: { eligible: false, slotNumber: null, alreadyClaimed: false },
    };
  }
  if (state.nextSlot > limit) {
    return {
      state,
      result: { eligible: false, slotNumber: null, alreadyClaimed: false },
    };
  }
  const grant: EarlyBirdGrant = {
    userId: input.userId,
    storeId: input.storeId,
    slotNumber: state.nextSlot,
    claimedAt: input.now,
    appliedAt: null,
    discountUntil: null,
    planId: null,
    billingPeriod: null,
    chargedAmountUsd: null,
  };
  return {
    state: {
      nextSlot: state.nextSlot + 1,
      grants: [...state.grants, grant],
    },
    result: {
      eligible: true,
      slotNumber: grant.slotNumber,
      alreadyClaimed: false,
    },
  };
}

/** True while the merchant still has an unused or in-window first-year discount. */
export function earlyBirdStillApplies(
  grant: EarlyBirdGrant | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!grant) return false;
  if (!grant.discountUntil) return true;
  const until = Date.parse(grant.discountUntil);
  return Number.isFinite(until) && now.getTime() < until;
}

export type ActivationCharge = {
  amountUsd: number;
  earlyBird: boolean;
  /** Set on the first paid activation; unchanged on later renewals inside the year. */
  discountUntil: string | null;
};

/**
 * Sham Cash amount for one activation.
 * The discount covers the first paid year only: monthly bills inside that year
 * stay discounted, and the next charge after discountUntil is the full price.
 * Trial activation must not call this.
 */
export function activationCharge(input: {
  grant: EarlyBirdGrant | null;
  planId: "basic" | "pro";
  billingPeriod: BillingPeriod;
  now: Date;
}): ActivationCharge {
  const full = planPrice(PLANS[input.planId], input.billingPeriod);
  if (!input.grant || !earlyBirdStillApplies(input.grant, input.now)) {
    return {
      amountUsd: full,
      earlyBird: false,
      discountUntil: input.grant?.discountUntil ?? null,
    };
  }
  const discountUntil =
    input.grant.discountUntil ??
    new Date(input.now.getTime() + PAID_YEAR_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return {
    amountUsd: earlyBirdPrice(input.planId, input.billingPeriod),
    earlyBird: true,
    discountUntil,
  };
}
