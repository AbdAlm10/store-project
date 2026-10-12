import type {
  MerchantReferralItem,
  ReferralRepository,
} from "@/application/ports/referrals";
import { AppError } from "@/domain/errors";
import type { ReferralGrantStatus, ReferralStatus } from "@/domain/referrals/book";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin-client";

function fail(message: string): never {
  throw new AppError("INTERNAL", message);
}

export class SupabaseReferralRepository implements ReferralRepository {
  async ensureCode(userId: string): Promise<string> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("ensure_referral_code", {
      p_user_id: userId,
    });
    if (error || typeof data !== "string" || data.length < 16) {
      fail(error?.message ?? "تعذّر إنشاء رمز الإحالة.");
    }
    return data;
  }

  async attach(input: {
    referredUserId: string;
    code: string;
  }): Promise<"pending" | "rejected" | "ignored"> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("attach_referral", {
      p_referred_user_id: input.referredUserId,
      p_code: input.code,
    });
    if (error) fail(error.message);
    if (data === "pending" || data === "rejected" || data === "ignored") return data;
    return "rejected";
  }

  async grantOnFirstPaidActivation(input: {
    referredUserId: string;
    storeId: string;
  }): Promise<ReferralGrantStatus> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("grant_referral_month", {
      p_referred_user_id: input.referredUserId,
      p_store_id: input.storeId,
    });
    if (error) fail(error.message);
    if (
      data === "rewarded" ||
      data === "already_rewarded" ||
      data === "rejected" ||
      data === "skipped"
    ) {
      return data;
    }
    return "skipped";
  }

  async listForReferrer(referrerUserId: string): Promise<MerchantReferralItem[]> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("referrals")
      .select("referred_user_id, status, created_at, rewarded_at")
      .eq("referrer_user_id", referrerUserId)
      .order("created_at", { ascending: false });
    if (error) fail(error.message);
    const rows = data ?? [];
    const ids = [...new Set(rows.map((row) => row.referred_user_id as string))];
    const emails = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", ids);
      if (profileError) fail(profileError.message);
      for (const profile of profiles ?? []) {
        emails.set(profile.id as string, (profile.email as string) ?? "");
      }
    }
    return rows.map((row) => ({
      referredUserId: row.referred_user_id as string,
      email: emails.get(row.referred_user_id as string) ?? "",
      status: row.status as ReferralStatus,
      createdAt: row.created_at as string,
      rewardedAt: (row.rewarded_at as string | null) ?? null,
    }));
  }
}
