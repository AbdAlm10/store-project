import { TRIAL_DAYS, type BillingPeriod, type PlanId } from "@/config/plans";

/** Paid month length used by manual Sham Cash activation. */
export const PAID_MONTH_DAYS = 30;
/** Paid year length used by manual Sham Cash activation. */
export const PAID_YEAR_DAYS = 365;
/** Free month granted to both merchants after a referral's first payment. */
export const REFERRAL_REWARD_DAYS = 30;

export function addUtcDays(from: Date, days: number): Date {
  const next = new Date(from.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** A still-future instant, or null when the stored end is missing or already past. */
export function futureInstant(
  iso: string | null | undefined,
  now: Date = new Date(),
): Date | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed) || parsed <= now.getTime()) return null;
  return new Date(parsed);
}

export function periodLengthDays(planId: PlanId, billingPeriod: BillingPeriod): number {
  if (planId === "trial") return TRIAL_DAYS;
  return billingPeriod === "yearly" ? PAID_YEAR_DAYS : PAID_MONTH_DAYS;
}

/**
 * End of the period an admin just activated.
 * A paid plan stacks onto a paid period that has not ended yet.
 * Trial always starts from `now` for {@link TRIAL_DAYS} days.
 */
export function nextPeriodEnd(input: {
  now: Date;
  planId: PlanId;
  billingPeriod: BillingPeriod;
  previous: { planId: PlanId; currentPeriodEnd: string | null } | null;
}): Date {
  const days = periodLengthDays(input.planId, input.billingPeriod);
  if (input.planId === "trial") return addUtcDays(input.now, days);

  const previous = input.previous;
  if (previous && previous.planId !== "trial") {
    const remaining = futureInstant(previous.currentPeriodEnd, input.now);
    if (remaining) return addUtcDays(remaining, days);
  }
  return addUtcDays(input.now, days);
}

/** Extend `anchor` when it is still in the future; otherwise start at `now`. */
export function extendFrom(anchor: string | null | undefined, days: number, now: Date): Date {
  return addUtcDays(futureInstant(anchor, now) ?? now, days);
}
