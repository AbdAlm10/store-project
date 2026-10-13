import type { ReferralRepository } from "@/application/ports/referrals";
import {
  ReferralBook,
  pickReferrerSubscription,
  type ReferralGrantStatus,
} from "@/domain/referrals/book";
import { contactIdentity } from "@/domain/referrals/normalize";
import {
  memoryApplyReferralPatches,
  memoryReferralSubject,
} from "@/infrastructure/memory/repositories";

const globalForBook = globalThis as unknown as { __dukkanReferralBook?: ReferralBook };

function sharedBook(): ReferralBook {
  globalForBook.__dukkanReferralBook ??= new ReferralBook();
  return globalForBook.__dukkanReferralBook;
}

export class MemoryReferralRepository implements ReferralRepository {
  constructor(private readonly book: ReferralBook = sharedBook()) {}

  async ensureCode(userId: string): Promise<string> {
    return this.book.ensureCode(userId);
  }

  async attach(input: {
    referredUserId: string;
    code: string;
  }): Promise<"pending" | "rejected" | "ignored"> {
    const ownerId = this.book.codeOwner(input.code);
    const referrer = ownerId ? memoryReferralSubject(ownerId) : null;
    const referred = memoryReferralSubject(input.referredUserId);
    return this.book.attach({
      referredUserId: input.referredUserId,
      code: input.code,
      referrerIdentity: referrer?.identity ?? null,
      referredIdentity: referred.identity.emails.length || referred.identity.phones.length
        ? referred.identity
        : contactIdentity([], []),
    });
  }

  async grantOnFirstPaidActivation(input: {
    referredUserId: string;
    storeId: string;
  }): Promise<ReferralGrantStatus> {
    const now = new Date();
    const referral = this.book.referralFor(input.referredUserId);
    const referred = memoryReferralSubject(input.referredUserId);
    const referrer = referral ? memoryReferralSubject(referral.referrerUserId) : null;
    const referredSubscription =
      referred.subscriptions.find((sub) => sub.storeId === input.storeId) ?? null;
    const referrerSubscription = referrer
      ? pickReferrerSubscription(referrer.subscriptions, now)
      : null;
    const outcome = this.book.grant({
      referredUserId: input.referredUserId,
      storeId: input.storeId,
      referredIdentity: referred.identity,
      referrerIdentity: referrer?.identity ?? null,
      referredSubscription,
      referrerSubscription,
      now,
    });
    memoryApplyReferralPatches(outcome.patches);
    return outcome.status;
  }

  async listForReferrer(referrerUserId: string) {
    return this.book.listForReferrer(referrerUserId).map((row) => ({
      referredUserId: row.referredUserId,
      email: memoryReferralSubject(row.referredUserId).identity.emails[0] ?? "",
      status: row.status,
      createdAt: row.createdAt,
      rewardedAt: row.rewardedAt,
    }));
  }
}
