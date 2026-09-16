import type {
  AnalyticsRepository,
  CategoryRepository,
  ListProductsQuery,
  ProductRepository,
  StoreMemberRepository,
  StoreRepository,
  SubscriptionRepository,
  UserRepository,
} from "@/application/ports/repositories";
import type { PlanId } from "@/config/plans";
import { AppError } from "@/domain/errors";
import type {
  AnalyticsEvent,
  Category,
  Paginated,
  Product,
  ProductImage,
  ProductVariant,
  ProductWithMedia,
  Profile,
  Store,
  StoreMember,
  Subscription,
} from "@/domain/types/entities";
import type { AnalyticsEventType, ProductStatus } from "@/domain/types/enums";
import {
  mapCategory,
  mapImage,
  mapMember,
  mapProduct,
  mapProfile,
  mapStore,
  mapSubscription,
  mapVariant,
  productToRow,
  storeToRow,
  withMedia,
} from "@/infrastructure/supabase/mappers";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

async function db() {
  return createSupabaseServerClient();
}

function fail(message: string): never {
  throw new AppError("INTERNAL", message);
}

export class SupabaseUserRepository implements UserRepository {
  async findProfileById(id: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapProfile(data) : null;
  }

  async upsertProfile(
    profile: Omit<Profile, "createdAt" | "updatedAt"> &
      Partial<Pick<Profile, "createdAt" | "updatedAt">>,
  ) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: profile.id,
          email: profile.email,
          full_name: profile.fullName,
          avatar_url: profile.avatarUrl,
          platform_role: profile.platformRole,
          locale: profile.locale,
          suspended_at: profile.suspendedAt,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();
    if (error || !data) fail(error?.message ?? "Profile upsert failed");
    return mapProfile(data);
  }

  async setSuspended(userId: string, suspended: boolean) {
    const supabase = await db();
    const { error } = await supabase
      .from("profiles")
      .update({
        suspended_at: suspended ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) fail(error.message);
  }
}

export class SupabaseStoreRepository implements StoreRepository {
  async findById(id: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapStore(data) : null;
  }

  async findBySlug(slug: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapStore(data) : null;
  }

  async listByUserId(userId: string) {
    const supabase = await db();
    const { data: memberships, error: memberError } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", userId);
    if (memberError) fail(memberError.message);
    const ids = (memberships ?? []).map((row) => row.store_id as string);
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from("stores").select("*").in("id", ids);
    if (error) fail(error.message);
    return (data ?? []).map(mapStore);
  }

  async create(
    input: Omit<Store, "createdAt" | "updatedAt" | "publishedAt" | "suspendedAt"> & {
      publishedAt?: string | null;
      suspendedAt?: string | null;
    },
  ) {
    const supabase = await db();
    const payload = storeToRow({
      ...input,
      publishedAt: input.publishedAt ?? null,
      suspendedAt: input.suspendedAt ?? null,
    });
    // Don't require migration 00007 for signup — DB default applies once column exists.
    delete payload.theme_overrides;
    const { data, error } = await supabase
      .from("stores")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      // Surface a clearer message for the common draft RETURNING RLS miss.
      if (error.message.toLowerCase().includes("row-level security")) {
        fail(
          "Could not create store (RLS). Apply migration 20260908000004_fix_stores_rls.sql in Supabase SQL Editor, then try again.",
        );
      }
      if (error.message.toLowerCase().includes("theme_overrides")) {
        fail(
          "Missing theme_overrides column. Run migration 20260908000007_theme_overrides.sql in the Supabase SQL Editor, then try again.",
        );
      }
      fail(error.message);
    }
    if (!data) fail("Store create failed");
    return mapStore(data);
  }

  async update(id: string, patch: Partial<Store>) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("stores")
      .update({ ...storeToRow(patch), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      if (error?.message.toLowerCase().includes("theme_overrides")) {
        fail(
          "Missing theme_overrides column. Run migration 20260908000007_theme_overrides.sql in the Supabase SQL Editor, then try again.",
        );
      }
      fail(error?.message ?? "Store update failed");
    }
    return mapStore(data);
  }

  async slugExists(slug: string, excludeId?: string) {
    const supabase = await db();
    let query = supabase.from("stores").select("id").eq("slug", slug).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) fail(error.message);
    return (data?.length ?? 0) > 0;
  }
}

export class SupabaseStoreMemberRepository implements StoreMemberRepository {
  async findMembership(storeId: string, userId: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("store_members")
      .select("*")
      .eq("store_id", storeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapMember(data) : null;
  }

  async listByStore(storeId: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("store_members")
      .select("*")
      .eq("store_id", storeId);
    if (error) fail(error.message);
    return (data ?? []).map(mapMember);
  }

  async create(member: Omit<StoreMember, "id" | "createdAt"> & { id?: string }) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("store_members")
      .insert({
        id: member.id,
        store_id: member.storeId,
        user_id: member.userId,
        role: member.role,
      })
      .select("*")
      .single();
    if (error) {
      if (error.message.toLowerCase().includes("row-level security")) {
        fail(
          "Could not add store membership (RLS). Apply migration 20260908000005_fix_store_members_rls.sql in Supabase SQL Editor, then try again.",
        );
      }
      fail(error.message);
    }
    if (!data) fail("Membership create failed");
    return mapMember(data);
  }
}

export class SupabaseCategoryRepository implements CategoryRepository {
  async listByStore(storeId: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true });
    if (error) fail(error.message);
    return (data ?? []).map(mapCategory);
  }

  async findById(id: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapCategory(data) : null;
  }

  async findBySlug(storeId: string, slug: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapCategory(data) : null;
  }

  async create(
    input: Omit<Category, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        id: input.id,
        store_id: input.storeId,
        name: input.name,
        slug: input.slug,
        sort_order: input.sortOrder,
        image_url: input.imageUrl ?? null,
        icon: input.icon ?? null,
        option_schema: input.optionSchema ?? [],
      })
      .select("*")
      .single();
    if (error || !data) fail(error?.message ?? "Category create failed");
    return mapCategory(data);
  }

  async update(id: string, patch: Partial<Category>) {
    const supabase = await db();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.slug !== undefined) row.slug = patch.slug;
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
    if (patch.imageUrl !== undefined) row.image_url = patch.imageUrl;
    if (patch.icon !== undefined) row.icon = patch.icon;
    if (patch.optionSchema !== undefined) row.option_schema = patch.optionSchema;
    const { data, error } = await supabase
      .from("categories")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) fail(error?.message ?? "Category update failed");
    return mapCategory(data);
  }

  async delete(id: string) {
    const supabase = await db();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) fail(error.message);
  }

  async reorder(storeId: string, orderedIds: string[]) {
    const supabase = await db();
    for (let index = 0; index < orderedIds.length; index += 1) {
      const { error } = await supabase
        .from("categories")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", orderedIds[index])
        .eq("store_id", storeId);
      if (error) fail(error.message);
    }
  }
}

export class SupabaseProductRepository implements ProductRepository {
  private async loadMedia(productIds: string[]) {
    if (productIds.length === 0) {
      return {
        images: [] as ProductImage[],
        variants: [] as ProductVariant[],
      };
    }
    const supabase = await db();
    const [{ data: images }, { data: variants }] = await Promise.all([
      supabase.from("product_images").select("*").in("product_id", productIds),
      supabase.from("product_variants").select("*").in("product_id", productIds),
    ]);
    return {
      images: (images ?? []).map(mapImage),
      variants: (variants ?? []).map(mapVariant),
    };
  }

  private async attach(
    products: Product[],
  ): Promise<ProductWithMedia[]> {
    const ids = products.map((item) => item.id);
    const { images, variants } = await this.loadMedia(ids);
    const categoryIds = [
      ...new Set(
        products
          .map((item) => item.categoryId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const supabase = await db();
    const categories =
      categoryIds.length === 0
        ? []
        : (
            await supabase.from("categories").select("*").in("id", categoryIds)
          ).data?.map(mapCategory) ?? [];
    const categoryMap = new Map(categories.map((item) => [item.id, item]));

    return products.map((product) =>
      withMedia(
        product,
        images.filter((image) => image.productId === product.id),
        variants.filter((variant) => variant.productId === product.id),
        product.categoryId ? categoryMap.get(product.categoryId) : null,
      ),
    );
  }

  async list(query: ListProductsQuery): Promise<Paginated<ProductWithMedia>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 24;
    const supabase = await db();
    let builder = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("store_id", query.storeId)
      .order("updated_at", { ascending: false });

    if (query.categoryId) builder = builder.eq("category_id", query.categoryId);
    if (query.featured !== undefined) {
      builder = builder.eq("featured", query.featured);
    }
    if (query.status) {
      if (Array.isArray(query.status)) {
        builder = builder.in("status", query.status);
      } else {
        builder = builder.eq("status", query.status);
      }
    }
    if (query.search?.trim()) {
      const q = `%${query.search.trim()}%`;
      builder = builder.or(`name.ilike.${q},description.ilike.${q}`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await builder.range(from, to);
    if (error) fail(error.message);
    const products = (data ?? []).map(mapProduct);
    const items = await this.attach(products);
    const total = count ?? items.length;
    return {
      items,
      total,
      page,
      pageSize,
      hasMore: from + pageSize < total,
    };
  }

  async findById(id: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error.message);
    if (!data) return null;
    const [item] = await this.attach([mapProduct(data)]);
    return item ?? null;
  }

  async findBySlug(storeId: string, slug: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) fail(error.message);
    if (!data) return null;
    const [item] = await this.attach([mapProduct(data)]);
    return item ?? null;
  }

  async countByStore(storeId: string, statuses?: ProductStatus[]) {
    const supabase = await db();
    let builder = supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);
    if (statuses?.length) builder = builder.in("status", statuses);
    const { count, error } = await builder;
    if (error) fail(error.message);
    return count ?? 0;
  }

  async create(
    input: Omit<Product, "id" | "createdAt" | "updatedAt" | "publishedAt"> & {
      id?: string;
      publishedAt?: string | null;
    },
  ) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("products")
      .insert(productToRow({ ...input, publishedAt: input.publishedAt ?? null }))
      .select("*")
      .single();
    if (error || !data) fail(error?.message ?? "Product create failed");
    return mapProduct(data);
  }

  async update(id: string, patch: Partial<Product>) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("products")
      .update({ ...productToRow(patch), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) fail(error?.message ?? "Product update failed");
    return mapProduct(data);
  }

  async delete(id: string) {
    const supabase = await db();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) fail(error.message);
  }

  async replaceImages(
    productId: string,
    storeId: string,
    images: Omit<ProductImage, "id">[],
  ) {
    const supabase = await db();
    const { error: deleteError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId);
    if (deleteError) fail(deleteError.message);
    if (images.length === 0) return [];
    const { data, error } = await supabase
      .from("product_images")
      .insert(
        images.map((image) => ({
          product_id: productId,
          store_id: storeId,
          url: image.url,
          alt: image.alt,
          sort_order: image.sortOrder,
          width: image.width,
          height: image.height,
        })),
      )
      .select("*");
    if (error) fail(error.message);
    return (data ?? []).map(mapImage);
  }

  async replaceVariants(
    productId: string,
    storeId: string,
    variants: Omit<ProductVariant, "id">[],
  ) {
    const supabase = await db();
    const { error: deleteError } = await supabase
      .from("product_variants")
      .delete()
      .eq("product_id", productId);
    if (deleteError) fail(deleteError.message);
    if (variants.length === 0) return [];
    const { data, error } = await supabase
      .from("product_variants")
      .insert(
        variants.map((variant) => ({
          product_id: productId,
          store_id: storeId,
          name: variant.name,
          options: variant.options,
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku,
        })),
      )
      .select("*");
    if (error) fail(error.message);
    return (data ?? []).map(mapVariant);
  }
}

export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  async findByStoreId(storeId: string) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) fail(error.message);
    return data ? mapSubscription(data) : null;
  }

  async create(
    input: Omit<Subscription, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        id: input.id,
        store_id: input.storeId,
        plan_id: input.planId,
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

  async update(id: string, patch: Partial<Subscription>) {
    const supabase = await db();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.planId !== undefined) row.plan_id = patch.planId;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.trialEndsAt !== undefined) row.trial_ends_at = patch.trialEndsAt;
    if (patch.currentPeriodEnd !== undefined) {
      row.current_period_end = patch.currentPeriodEnd;
    }
    if (patch.stripeCustomerId !== undefined) {
      row.stripe_customer_id = patch.stripeCustomerId;
    }
    if (patch.stripeSubscriptionId !== undefined) {
      row.stripe_subscription_id = patch.stripeSubscriptionId;
    }
    const { data, error } = await supabase
      .from("subscriptions")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) fail(error?.message ?? "Subscription update failed");
    return mapSubscription(data);
  }

  async changePlan(storeId: string, planId: PlanId) {
    const current = await this.findByStoreId(storeId);
    if (!current) throw new AppError("NOT_FOUND", "Subscription not found");
    return this.update(current.id, { planId, status: "active" });
  }
}

export class SupabaseAnalyticsRepository implements AnalyticsRepository {
  async track(
    event: Omit<AnalyticsEvent, "id" | "createdAt"> & { id?: string },
  ) {
    const supabase = await db();
    const { error } = await supabase.from("analytics_events").insert({
      id: event.id,
      store_id: event.storeId,
      product_id: event.productId,
      event_type: event.eventType,
      source: event.source,
      path: event.path,
      visitor_key: event.visitorKey,
      metadata: event.metadata ?? {},
    });
    if (error) fail(error.message);
  }

  async countEvents(
    storeId: string,
    eventType: AnalyticsEventType,
    since: string,
  ) {
    const supabase = await db();
    const { count, error } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("event_type", eventType)
      .gte("created_at", since);
    if (error) fail(error.message);
    return count ?? 0;
  }

  async topProducts(storeId: string, since: string, limit = 5) {
    const supabase = await db();
    // Cap the scan so a busy store cannot pull the entire events table into Node.
    const { data, error } = await supabase
      .from("analytics_events")
      .select("product_id")
      .eq("store_id", storeId)
      .eq("event_type", "product_view")
      .gte("created_at", since)
      .not("product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(2_000);
    if (error) fail(error.message);
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const id = row.product_id as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([productId, views]) => ({ productId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  async listRecent(storeId: string, since: string, limit = 5_000) {
    const supabase = await db();
    const { data, error } = await supabase
      .from("analytics_events")
      .select("product_id, event_type, source, visitor_key, created_at, metadata")
      .eq("store_id", storeId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) fail(error.message);
    return (data ?? []).map((row) => ({
      productId: (row.product_id as string | null) ?? null,
      eventType: row.event_type as AnalyticsEvent["eventType"],
      source: (row.source as string | null) ?? null,
      visitorKey: (row.visitor_key as string | null) ?? null,
      createdAt: row.created_at as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  }
}
