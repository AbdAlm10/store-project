import type {
  MerchantReferralItem,
  ReferralRepository,
} from "@/application/ports/referrals";
import type { ReferralGrantStatus } from "@/domain/referrals/book";
import { REFERRAL_CODE_PATTERN } from "@/lib/referrals/cookie";

export class ReferralService {
  constructor(private readonly referrals: ReferralRepository) {}

  async ensureCode(userId: string): Promise<string> {
    return this.referrals.ensureCode(userId);
  }

  async getMerchantView(userId: string): Promise<{
    code: string;
    items: MerchantReferralItem[];
  }> {
    const code = await this.referrals.ensureCode(userId);
    const items = await this.referrals.listForReferrer(userId);
    return { code, items };
  }

  /** Never throws for a bad code — signup must still succeed. */
  async attachFromCode(referredUserId: string, raw: string | null | undefined): Promise<void> {
    const code = (raw ?? "").trim();
    if (!REFERRAL_CODE_PATTERN.test(code)) return;
    await this.referrals.attach({ referredUserId, code });
  }

  grantOnFirstPaidActivation(input: {
    referredUserId: string;
    storeId: string;
  }): Promise<ReferralGrantStatus> {
    return this.referrals.grantOnFirstPaidActivation(input);
  }
}
