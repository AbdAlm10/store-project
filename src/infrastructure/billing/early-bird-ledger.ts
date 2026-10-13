import type { BillingPeriod } from "@/config/plans";
import {
  type EarlyBirdClaimResult,
  type EarlyBirdGrant,
} from "@/domain/billing/early-bird";
import { MemoryEarlyBirdLedger } from "@/infrastructure/billing/early-bird-memory";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin-client";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export type EarlyBirdActivationRecord = {
  userId: string;
  storeId: string;
  planId: "basic" | "pro";
  billingPeriod: BillingPeriod;
  chargedAmountUsd: number;
  discountUntil: string;
  appliedAt: string;
};

export interface EarlyBirdLedger {
  claim(input: { userId: string; storeId: string }): Promise<EarlyBirdClaimResult>;
  findByUserId(userId: string): Promise<EarlyBirdGrant | null>;
  recordActivation(input: EarlyBirdActivationRecord): Promise<void>;
}

function mapGrant(row: Record<string, unknown>): EarlyBirdGrant {
  const planId = row.plan_id === "basic" || row.plan_id === "pro" ? row.plan_id : null;
  const billingPeriod =
    row.billing_period === "yearly" || row.billing_period === "monthly"
      ? row.billing_period
      : null;
  return {
    userId: String(row.user_id),
    storeId: String(row.store_id),
    slotNumber: Number(row.slot_number),
    claimedAt: String(row.claimed_at),
    appliedAt: (row.applied_at as string | null) ?? null,
    discountUntil: (row.discount_until as string | null) ?? null,
    planId,
    billingPeriod,
    chargedAmountUsd:
      row.charged_amount_usd == null ? null : Number(row.charged_amount_usd),
  };
}

function missingRelation(message: string): boolean {
  return /early_bird_|schema cache|does not exist|could not find/i.test(message);
}

class SupabaseEarlyBirdLedger implements EarlyBirdLedger {
  async claim(input: { userId: string; storeId: string }): Promise<EarlyBirdClaimResult> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("claim_early_bird_slot", {
      target_store_id: input.storeId,
    });
    if (error) {
      if (missingRelation(error.message)) {
        return { eligible: false, slotNumber: null, alreadyClaimed: false };
      }
      throw new Error(error.message);
    }
    const payload = (data ?? {}) as {
      eligible?: boolean;
      slot_number?: number | null;
      already_claimed?: boolean;
    };
    return {
      eligible: payload.eligible === true,
      slotNumber: payload.slot_number == null ? null : Number(payload.slot_number),
      alreadyClaimed: payload.already_claimed === true,
    };
  }

  async findByUserId(userId: string): Promise<EarlyBirdGrant | null> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("early_bird_grants")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      if (missingRelation(error.message)) return null;
      throw new Error(error.message);
    }
    return data ? mapGrant(data as Record<string, unknown>) : null;
  }

  async recordActivation(input: EarlyBirdActivationRecord): Promise<void> {
    const supabase = createSupabaseAdminClient();
    const existing = await this.findByUserId(input.userId);
    if (!existing) return;
    const { error } = await supabase
      .from("early_bird_grants")
      .update({
        applied_at: existing.appliedAt ?? input.appliedAt,
        discount_until: existing.discountUntil ?? input.discountUntil,
        plan_id: input.planId,
        billing_period: input.billingPeriod,
        charged_amount_usd: input.chargedAmountUsd,
      })
      .eq("user_id", input.userId);
    if (error && !missingRelation(error.message)) {
      throw new Error(error.message);
    }
  }
}

const memoryLedger = new MemoryEarlyBirdLedger();

export function getEarlyBirdLedger(): EarlyBirdLedger {
  return isSupabaseConfigured() ? new SupabaseEarlyBirdLedger() : memoryLedger;
}

/** Claim a first-100 slot. Failures quote the full price instead of blocking payment. */
export async function claimEarlyBirdForMerchant(input: {
  userId: string;
  storeId: string;
}): Promise<boolean> {
  try {
    const result = await getEarlyBirdLedger().claim(input);
    return result.eligible;
  } catch (error) {
    console.error("early-bird claim failed", error);
    return false;
  }
}
