import {
  REFERRAL_REWARD_DAYS,
  addUtcDays,
  futureInstant,
} from "@/domain/billing/period";
import type { PlanId } from "@/config/plans";
import type { SubscriptionStatus } from "@/domain/types/enums";
import {
  sharedContact,
  type ContactIdentity,
} from "@/domain/referrals/normalize";
import {
  REFERRAL_CODE_PATTERN,
  generateReferralCode,
} from "@/lib/referrals/cookie";

export type ReferralStatus = "pending" | "rewarded" | "rejected";

export type ReferralRecord = {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  code: string;
  status: ReferralStatus;
  rejectReason: string | null;
  createdAt: string;
  rewardedAt: string | null;
};

export type ReferralRewardRow = {
  referralId: string;
  beneficiaryUserId: string;
  days: number;
};

export type ReferralAuditEvent = {
  eventType: string;
  actorUserId: string | null;
  referrerUserId: string | null;
  referredUserId: string | null;
  referralId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type ReferralSubscriptionSnapshot = {
  id: string;
  storeId: string;
  ownerId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  storeStatus: "draft" | "published" | "suspended" | "restricted";
  suspendedAt: string | null;
  updatedAt: string;
};

export type ReferralAccessPatch = {
  subscriptionId: string;
  storeId: string;
  status: "trialing" | "active";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  republish: boolean;
};

export type ReferralGrantStatus =
  | "rewarded"
  | "already_rewarded"
  | "rejected"
  | "skipped";

function extendIso(anchor: string | null, now: Date, days: number): string {
  const base = futureInstant(anchor, now) ?? now;
  return addUtcDays(base, days).toISOString();
}

export function pickReferrerSubscription<T extends ReferralSubscriptionSnapshot>(
  subscriptions: T[],
  now: Date,
): T | null {
  if (subscriptions.length === 0) return null;
  const ranked = [...subscriptions].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
  const usable = ranked.find((sub) => snapshotUsable(sub, now));
  return usable ?? ranked[0];
}

function snapshotUsable(sub: ReferralSubscriptionSnapshot, now: Date): boolean {
  if (sub.status !== "trialing" && sub.status !== "active" && sub.status !== "past_due") {
    return false;
  }
  const end = sub.planId === "trial" ? sub.trialEndsAt : sub.currentPeriodEnd;
  if (!end) return true;
  const parsed = Date.parse(end);
  return Number.isFinite(parsed) && parsed >= now.getTime();
}

export function rewardPatches(input: {
  now: Date;
  referred: ReferralSubscriptionSnapshot;
  referrer: ReferralSubscriptionSnapshot | null;
}): ReferralAccessPatch[] {
  const referredEnd = extendIso(
    input.referred.currentPeriodEnd,
    input.now,
    REFERRAL_REWARD_DAYS,
  );
  const patches: ReferralAccessPatch[] = [
    {
      subscriptionId: input.referred.id,
      storeId: input.referred.storeId,
      status: "active",
      trialEndsAt: input.referred.trialEndsAt,
      currentPeriodEnd: referredEnd,
      republish:
        input.referred.storeStatus === "restricted" && !input.referred.suspendedAt,
    },
  ];

  const referrer = input.referrer;
  if (!referrer || referrer.id === input.referred.id) return patches;

  const trial = referrer.planId === "trial" || referrer.status === "trialing";
  if (trial) {
    const trialEnd = extendIso(referrer.trialEndsAt, input.now, REFERRAL_REWARD_DAYS);
    patches.push({
      subscriptionId: referrer.id,
      storeId: referrer.storeId,
      status: "trialing",
      trialEndsAt: trialEnd,
      currentPeriodEnd: referrer.currentPeriodEnd
        ? extendIso(referrer.currentPeriodEnd, input.now, REFERRAL_REWARD_DAYS)
        : trialEnd,
      republish: referrer.storeStatus === "restricted" && !referrer.suspendedAt,
    });
    return patches;
  }

  patches.push({
    subscriptionId: referrer.id,
    storeId: referrer.storeId,
    status: "active",
    trialEndsAt: referrer.trialEndsAt,
    currentPeriodEnd: extendIso(referrer.currentPeriodEnd, input.now, REFERRAL_REWARD_DAYS),
    republish: referrer.storeStatus === "restricted" && !referrer.suspendedAt,
  });
  return patches;
}

/**
 * In-memory referral ledger. Writes are synchronous so a grant is one
 * transaction: unique reward keys, status flip, and audit commit together.
 * Supabase uses the SQL function in the referrals migration for the same rules.
 */
export class ReferralBook {
  private readonly codesByUser = new Map<string, string>();
  private readonly userByCode = new Map<string, string>();
  private readonly referralsByReferred = new Map<string, ReferralRecord>();
  private readonly rewardKeys = new Set<string>();
  readonly rewards: ReferralRewardRow[] = [];
  readonly audit: ReferralAuditEvent[] = [];

  ensureCode(userId: string, now = new Date()): string {
    const existing = this.codesByUser.get(userId);
    if (existing) return existing;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateReferralCode();
      if (this.userByCode.has(code) || !REFERRAL_CODE_PATTERN.test(code)) continue;
      this.codesByUser.set(userId, code);
      this.userByCode.set(code, userId);
      this.pushAudit({
        eventType: "code_created",
        referrerUserId: userId,
        detail: { codeLength: code.length },
        now,
      });
      return code;
    }
    throw new Error("Could not allocate a referral code.");
  }

  codeOwner(code: string): string | null {
    if (!REFERRAL_CODE_PATTERN.test(code)) return null;
    return this.userByCode.get(code) ?? null;
  }

  referralFor(referredUserId: string): ReferralRecord | null {
    return this.referralsByReferred.get(referredUserId) ?? null;
  }

  listForReferrer(referrerUserId: string): ReferralRecord[] {
    return [...this.referralsByReferred.values()]
      .filter((row) => row.referrerUserId === referrerUserId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  attach(input: {
    referredUserId: string;
    code: string;
    referrerIdentity: ContactIdentity | null;
    referredIdentity: ContactIdentity;
    now?: Date;
  }): "pending" | "rejected" | "ignored" {
    const now = input.now ?? new Date();
    const ownerId = this.codeOwner(input.code);
    if (!ownerId || !input.referrerIdentity) {
      this.pushAudit({
        eventType: "attach_rejected",
        referredUserId: input.referredUserId,
        detail: { reason: "invalid_code" },
        now,
      });
      return "rejected";
    }
    if (ownerId === input.referredUserId) {
      this.pushAudit({
        eventType: "attach_rejected",
        referrerUserId: ownerId,
        referredUserId: input.referredUserId,
        detail: { reason: "self" },
        now,
      });
      return "rejected";
    }
    const existing = this.referralsByReferred.get(input.referredUserId);
    if (existing) {
      this.pushAudit({
        eventType: "attach_ignored",
        referrerUserId: ownerId,
        referredUserId: input.referredUserId,
        referralId: existing.id,
        detail: { reason: "already_attached", status: existing.status },
        now,
      });
      return "ignored";
    }
    const duplicate = sharedContact(input.referrerIdentity, input.referredIdentity);
    if (duplicate) {
      const row = this.insertReferral({
        referrerUserId: ownerId,
        referredUserId: input.referredUserId,
        code: input.code,
        status: "rejected",
        rejectReason: duplicate,
        now,
      });
      this.pushAudit({
        eventType: "attach_rejected",
        referrerUserId: ownerId,
        referredUserId: input.referredUserId,
        referralId: row.id,
        detail: { reason: duplicate },
        now,
      });
      return "rejected";
    }
    const row = this.insertReferral({
      referrerUserId: ownerId,
      referredUserId: input.referredUserId,
      code: input.code,
      status: "pending",
      rejectReason: null,
      now,
    });
    this.pushAudit({
      eventType: "attach_pending",
      referrerUserId: ownerId,
      referredUserId: input.referredUserId,
      referralId: row.id,
      detail: {},
      now,
    });
    return "pending";
  }

  grant(input: {
    referredUserId: string;
    storeId: string;
    referredIdentity: ContactIdentity;
    referrerIdentity: ContactIdentity | null;
    referredSubscription: ReferralSubscriptionSnapshot | null;
    referrerSubscription: ReferralSubscriptionSnapshot | null;
    now?: Date;
  }): { status: ReferralGrantStatus; patches: ReferralAccessPatch[] } {
    const now = input.now ?? new Date();
    const referral = this.referralsByReferred.get(input.referredUserId);
    if (!referral) {
      this.pushAudit({
        eventType: "reward_skipped",
        referredUserId: input.referredUserId,
        detail: { reason: "no_referral" },
        now,
      });
      return { status: "skipped", patches: [] };
    }
    if (referral.status === "rewarded") {
      this.pushAudit({
        eventType: "reward_already",
        referrerUserId: referral.referrerUserId,
        referredUserId: referral.referredUserId,
        referralId: referral.id,
        detail: {},
        now,
      });
      return { status: "already_rewarded", patches: [] };
    }
    if (referral.status === "rejected" || referral.referrerUserId === referral.referredUserId) {
      this.pushAudit({
        eventType: "reward_rejected",
        referrerUserId: referral.referrerUserId,
        referredUserId: referral.referredUserId,
        referralId: referral.id,
        detail: { reason: referral.rejectReason ?? "self" },
        now,
      });
      return { status: "rejected", patches: [] };
    }

    const duplicate =
      input.referrerIdentity == null
        ? "missing_referrer"
        : sharedContact(input.referrerIdentity, input.referredIdentity);
    if (duplicate) {
      referral.status = "rejected";
      referral.rejectReason = duplicate;
      this.pushAudit({
        eventType: "reward_rejected",
        referrerUserId: referral.referrerUserId,
        referredUserId: referral.referredUserId,
        referralId: referral.id,
        detail: { reason: duplicate },
        now,
      });
      return { status: "rejected", patches: [] };
    }

    const paid = input.referredSubscription;
    const paidOk =
      paid &&
      paid.storeId === input.storeId &&
      paid.ownerId === input.referredUserId &&
      (paid.planId === "basic" || paid.planId === "pro") &&
      paid.status === "active" &&
      futureInstant(paid.currentPeriodEnd, now) != null;
    if (!paid || !paidOk) {
      this.pushAudit({
        eventType: "reward_skipped",
        referrerUserId: referral.referrerUserId,
        referredUserId: referral.referredUserId,
        referralId: referral.id,
        detail: { reason: "not_paid" },
        now,
      });
      return { status: "skipped", patches: [] };
    }

    const patches = rewardPatches({
      now,
      referred: paid,
      referrer: input.referrerSubscription,
    });
    try {
      this.addReward(referral.id, referral.referredUserId);
      this.addReward(referral.id, referral.referrerUserId);
    } catch {
      referral.status = "rewarded";
      this.pushAudit({
        eventType: "reward_already",
        referrerUserId: referral.referrerUserId,
        referredUserId: referral.referredUserId,
        referralId: referral.id,
        detail: { reason: "unique_violation" },
        now,
      });
      return { status: "already_rewarded", patches: [] };
    }
    referral.status = "rewarded";
    referral.rewardedAt = now.toISOString();
    this.pushAudit({
      eventType: "reward_granted",
      referrerUserId: referral.referrerUserId,
      referredUserId: referral.referredUserId,
      referralId: referral.id,
      detail: {
        days: REFERRAL_REWARD_DAYS,
        referredStoreId: input.storeId,
        referrerStoreId: input.referrerSubscription?.storeId ?? null,
      },
      now,
    });
    return { status: "rewarded", patches };
  }

  private insertReferral(input: {
    referrerUserId: string;
    referredUserId: string;
    code: string;
    status: ReferralStatus;
    rejectReason: string | null;
    now: Date;
  }): ReferralRecord {
    if (this.referralsByReferred.has(input.referredUserId)) {
      throw new Error("unique_violation");
    }
    const row: ReferralRecord = {
      id: crypto.randomUUID(),
      referrerUserId: input.referrerUserId,
      referredUserId: input.referredUserId,
      code: input.code,
      status: input.status,
      rejectReason: input.rejectReason,
      createdAt: input.now.toISOString(),
      rewardedAt: null,
    };
    this.referralsByReferred.set(input.referredUserId, row);
    return row;
  }

  private addReward(referralId: string, beneficiaryUserId: string) {
    const key = `${referralId}:${beneficiaryUserId}`;
    if (this.rewardKeys.has(key)) throw new Error("unique_violation");
    this.rewardKeys.add(key);
    this.rewards.push({
      referralId,
      beneficiaryUserId,
      days: REFERRAL_REWARD_DAYS,
    });
  }

  private pushAudit(input: {
    eventType: string;
    actorUserId?: string | null;
    referrerUserId?: string | null;
    referredUserId?: string | null;
    referralId?: string | null;
    detail: Record<string, unknown>;
    now: Date;
  }) {
    this.audit.push({
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      referrerUserId: input.referrerUserId ?? null,
      referredUserId: input.referredUserId ?? null,
      referralId: input.referralId ?? null,
      detail: input.detail,
      createdAt: input.now.toISOString(),
    });
  }
}
