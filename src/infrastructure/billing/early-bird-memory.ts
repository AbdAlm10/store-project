import {
  reduceClaim,
  type EarlyBirdClaimResult,
  type EarlyBirdCounter,
  type EarlyBirdGrant,
} from "@/domain/billing/early-bird";
import type {
  EarlyBirdActivationRecord,
  EarlyBirdLedger,
} from "@/infrastructure/billing/early-bird-ledger";

type MemoryBag = { counter: EarlyBirdCounter };

function memoryBag(): MemoryBag {
  const host = globalThis as typeof globalThis & { __dukkaanEarlyBird?: MemoryBag };
  if (!host.__dukkaanEarlyBird) {
    host.__dukkaanEarlyBird = { counter: { nextSlot: 1, grants: [] } };
  }
  return host.__dukkaanEarlyBird;
}

export function readMemoryEarlyBirdGrant(userId: string): EarlyBirdGrant | null {
  return memoryBag().counter.grants.find((grant) => grant.userId === userId) ?? null;
}

export class MemoryEarlyBirdLedger implements EarlyBirdLedger {
  async claim(input: { userId: string; storeId: string }): Promise<EarlyBirdClaimResult> {
    const bag = memoryBag();
    const next = reduceClaim(bag.counter, {
      userId: input.userId,
      storeId: input.storeId,
      now: new Date().toISOString(),
    });
    bag.counter = next.state;
    return next.result;
  }

  async findByUserId(userId: string): Promise<EarlyBirdGrant | null> {
    return readMemoryEarlyBirdGrant(userId);
  }

  async recordActivation(input: EarlyBirdActivationRecord): Promise<void> {
    const bag = memoryBag();
    bag.counter = {
      ...bag.counter,
      grants: bag.counter.grants.map((grant) =>
        grant.userId === input.userId
          ? {
              ...grant,
              storeId: input.storeId,
              appliedAt: grant.appliedAt ?? input.appliedAt,
              discountUntil: grant.discountUntil ?? input.discountUntil,
              planId: input.planId,
              billingPeriod: input.billingPeriod,
              chargedAmountUsd: input.chargedAmountUsd,
            }
          : grant,
      ),
    };
  }
}
