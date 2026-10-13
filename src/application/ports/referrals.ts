import type { ReferralGrantStatus, ReferralStatus } from "@/domain/referrals/book";

export type MerchantReferralItem = {
  referredUserId: string;
  email: string;
  status: ReferralStatus;
  createdAt: string;
  rewardedAt: string | null;
};

export interface ReferralRepository {
  ensureCode(userId: string): Promise<string>;
  attach(input: {
    referredUserId: string;
    code: string;
  }): Promise<"pending" | "rejected" | "ignored">;
  grantOnFirstPaidActivation(input: {
    referredUserId: string;
    storeId: string;
  }): Promise<ReferralGrantStatus>;
  listForReferrer(referrerUserId: string): Promise<MerchantReferralItem[]>;
}
