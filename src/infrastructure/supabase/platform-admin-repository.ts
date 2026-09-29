import type {
  AdminStorePatch,
  AdminStoreRow,
  AdminSubscriptionPatch,
  PlatformAdminRepository,
} from "@/application/ports/platform-admin";
import { AppError } from "@/domain/errors";
import type { Store, Subscription } from "@/domain/types/entities";
import { createSupabaseAdminClient } from "@/infrastructure/supabase/admin-client";
import {
  mapProfile,
  mapStore,
  mapSubscription,
  storeToRow,
} from "@/infrastructure/supabase/mappers";

function fail(message: string): never {
  throw new AppError("INTERNAL", message);
}

export class SupabasePlatformAdminRepository implements PlatformAdminRepository {
  async listUsers() {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) fail(error.message);
    return (data ?? []).map(mapProfile);
  }

  async listStoresWithSubscriptions(): Promise<AdminStoreRow[]> {
    const supabase = createSupabaseAdminClient();
    const { data: stores, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });
    if (storeError) fail(storeError.message);

    const storeRows = (stores ?? []).map(mapStore);
    if (storeRows.length === 0) return [];

    const storeIds = storeRows.map((s) => s.id);
    const ownerIds = [...new Set(storeRows.map((s) => s.ownerId))];

    const [{ data: subs, error: subError }, { data: profiles, error: profileError }] =
      await Promise.all([
        supabase.from("subscriptions").select("*").in("store_id", storeIds),
        supabase.from("profiles").select("*").in("id", ownerIds),
      ]);
    if (subError) fail(subError.message);
    if (profileError) fail(profileError.message);

    const subByStore = new Map<string, Subscription>();
    for (const row of subs ?? []) {
      const sub = mapSubscription(row);
      subByStore.set(sub.storeId, sub);
    }
    const profileById = new Map(
      (profiles ?? []).map((row) => [row.id as string, mapProfile(row)]),
    );

    return storeRows.map((store) => ({
      store,
      subscription: subByStore.get(store.id) ?? null,
      owner: profileById.get(store.ownerId) ?? null,
    }));
  }

  async setUserSuspended(userId: string, suspended: boolean) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        suspended_at: suspended ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) fail(error.message);
  }

  async updateStore(storeId: string, patch: AdminStorePatch): Promise<Store> {
    const supabase = createSupabaseAdminClient();
    const id = storeId.trim();

    const { data: existing, error: findError } = await supabase
      .from("stores")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (findError) fail(findError.message);
    if (!existing) {
      throw new AppError("NOT_FOUND", "المتجر غير موجود.");
    }

    const partial: Partial<Store> = {};
    if (patch.status !== undefined) partial.status = patch.status;
    if (patch.suspended !== undefined) {
      partial.suspendedAt = patch.suspended ? new Date().toISOString() : null;
      if (patch.suspended && patch.status === undefined) {
        partial.status = "restricted";
      } else if (!patch.suspended && patch.status === undefined) {
        const { data: cur } = await supabase
          .from("stores")
          .select("status")
          .eq("id", id)
          .maybeSingle();
        if (cur?.status === "restricted" || cur?.status === "suspended") {
          partial.status = "published";
        }
      }
    }
    if (patch.status === "published") {
      partial.publishedAt = new Date().toISOString();
    }

    const rowPatch = storeToRow(partial);
    const { data, error: updateError } = await supabase
      .from("stores")
      .update({
        ...rowPatch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (updateError) {
      if (updateError.code === "PGRST116") {
        fail(
          "تعذّر تحديث المتجر. لم تسمح قاعدة البيانات بتحديث أي صف. تحقق من أن SUPABASE_SERVICE_ROLE_KEY يخص المشروع نفسه وأن سياسة UPDATE للمتاجر مفعّلة.",
        );
      }
      fail(updateError.message);
    }

    if (!data) {
      throw new AppError("NOT_FOUND", "تعذّر قراءة المتجر بعد التحديث.");
    }
    return mapStore(data);
  }

  async updateSubscription(
    subscriptionId: string,
    patch: AdminSubscriptionPatch,
  ): Promise<Subscription> {
    const supabase = createSupabaseAdminClient();
    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.planId !== undefined) row.plan_id = patch.planId;
    if (patch.billingPeriod !== undefined) row.billing_period = patch.billingPeriod;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.trialEndsAt !== undefined) row.trial_ends_at = patch.trialEndsAt;
    if (patch.currentPeriodEnd !== undefined) {
      row.current_period_end = patch.currentPeriodEnd;
    }
    const id = subscriptionId.trim();
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(row)
      .eq("id", id);
    if (updateError) fail(updateError.message);

    const { data, error: refetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (refetchError) fail(refetchError.message);
    if (!data) {
      throw new AppError("NOT_FOUND", "الاشتراك غير موجود.");
    }
    return mapSubscription(data);
  }

  async createSubscription(
    input: Omit<Subscription, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ): Promise<Subscription> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        id: input.id,
        store_id: input.storeId,
        plan_id: input.planId,
        billing_period: input.billingPeriod,
        status: input.status,
        trial_ends_at: input.trialEndsAt,
        current_period_end: input.currentPeriodEnd,
        stripe_customer_id: input.stripeCustomerId,
        stripe_subscription_id: input.stripeSubscriptionId,
      })
      .select("*")
      .single();
    if (error || !data) fail(error?.message ?? "Subscription create failed");
    return mapSubscription(data);
  }
}
