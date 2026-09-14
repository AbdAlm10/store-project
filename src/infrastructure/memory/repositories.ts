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
import type { PlanId } from "@/config/plans";
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
import { demoSeed } from "@/infrastructure/demo/seed";
import { normalizeOptionSchema } from "@/lib/option-colors";

type Db = {
  profiles: Map<string, Profile>;
  stores: Map<string, Store>;
  members: Map<string, StoreMember>;
  categories: Map<string, Category>;
  products: Map<string, Product>;
  images: Map<string, ProductImage>;
  variants: Map<string, ProductVariant>;
  subscriptions: Map<string, Subscription>;
  events: AnalyticsEvent[];
};

function createDb(): Db {
  const db: Db = {
    profiles: new Map(),
    stores: new Map(),
    members: new Map(),
    categories: new Map(),
    products: new Map(),
    images: new Map(),
    variants: new Map(),
    subscriptions: new Map(),
    events: [],
  };

  for (const profile of demoSeed.profiles) db.profiles.set(profile.id, profile);
  for (const store of demoSeed.stores) db.stores.set(store.id, store);
  for (const member of demoSeed.members) db.members.set(member.id, member);
  for (const category of demoSeed.categories) db.categories.set(category.id, category);
  for (const product of demoSeed.products) db.products.set(product.id, product);
  for (const image of demoSeed.images) db.images.set(image.id, image);
  for (const variant of demoSeed.variants) db.variants.set(variant.id, variant);
  for (const sub of demoSeed.subscriptions) db.subscriptions.set(sub.id, sub);
  db.events.push(...demoSeed.events);

  return db;
}

const globalForDb = globalThis as unknown as { __yourstoreDb?: Db };
const db = globalForDb.__yourstoreDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__yourstoreDb = db;
}

function now() {
  return new Date().toISOString();
}

/** Used by MemoryAuthProvider to keep stable user ids across re-login. */
export function findMemoryProfileByEmail(email: string): Profile | null {
  const normalized = email.toLowerCase();
  return (
    [...db.profiles.values()].find(
      (profile) => profile.email.toLowerCase() === normalized,
    ) ?? null
  );
}

function withMedia(product: Product): ProductWithMedia {
  const images = [...db.images.values()]
    .filter((image) => image.productId === product.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const variants = [...db.variants.values()].filter(
    (variant) => variant.productId === product.id,
  );
  const category = product.categoryId
    ? (db.categories.get(product.categoryId) ?? null)
    : null;
  return { ...product, images, variants, category };
}

function matchesSearch(product: Product, search?: string): boolean {
  if (!search?.trim()) return true;
  const q = search.trim().toLowerCase();
  return (
    product.name.toLowerCase().includes(q) ||
    (product.description?.toLowerCase().includes(q) ?? false) ||
    product.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

function statusMatch(
  status: ProductStatus,
  filter?: ProductStatus | ProductStatus[],
): boolean {
  if (!filter) return true;
  return Array.isArray(filter) ? filter.includes(status) : filter === status;
}

export class MemoryUserRepository implements UserRepository {
  async findProfileById(id: string) {
    return db.profiles.get(id) ?? null;
  }

  async upsertProfile(
    profile: Omit<Profile, "createdAt" | "updatedAt"> &
      Partial<Pick<Profile, "createdAt" | "updatedAt">>,
  ) {
    const existing = db.profiles.get(profile.id);
    const next: Profile = {
      ...profile,
      createdAt: existing?.createdAt ?? profile.createdAt ?? now(),
      updatedAt: now(),
    };
    db.profiles.set(profile.id, next);
    return next;
  }

  async setSuspended(userId: string, suspended: boolean) {
    const profile = db.profiles.get(userId);
    if (!profile) return;
    db.profiles.set(userId, {
      ...profile,
      suspendedAt: suspended ? now() : null,
      updatedAt: now(),
    });
  }
}

export class MemoryStoreRepository implements StoreRepository {
  async findById(id: string) {
    return db.stores.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    return [...db.stores.values()].find((store) => store.slug === slug) ?? null;
  }

  async listByUserId(userId: string) {
    const storeIds = [...db.members.values()]
      .filter((member) => member.userId === userId)
      .map((member) => member.storeId);
    return storeIds
      .map((id) => db.stores.get(id))
      .filter((store): store is Store => Boolean(store));
  }

  async create(input: Omit<Store, "createdAt" | "updatedAt">) {
    const store: Store = {
      ...input,
      createdAt: now(),
      updatedAt: now(),
      publishedAt: input.publishedAt ?? null,
      suspendedAt: input.suspendedAt ?? null,
    };
    db.stores.set(store.id, store);
    return store;
  }

  async update(id: string, patch: Partial<Store>) {
    const current = db.stores.get(id);
    if (!current) throw new Error("Store not found");
    const next = { ...current, ...patch, id, updatedAt: now() };
    db.stores.set(id, next);
    return next;
  }

  async slugExists(slug: string, excludeId?: string) {
    return [...db.stores.values()].some(
      (store) => store.slug === slug && store.id !== excludeId,
    );
  }
}

export class MemoryStoreMemberRepository implements StoreMemberRepository {
  async findMembership(storeId: string, userId: string) {
    return (
      [...db.members.values()].find(
        (member) => member.storeId === storeId && member.userId === userId,
      ) ?? null
    );
  }

  async listByStore(storeId: string) {
    return [...db.members.values()].filter((member) => member.storeId === storeId);
  }

  async create(member: Omit<StoreMember, "id" | "createdAt"> & { id?: string }) {
    const next: StoreMember = {
      id: member.id ?? crypto.randomUUID(),
      storeId: member.storeId,
      userId: member.userId,
      role: member.role,
      createdAt: now(),
    };
    db.members.set(next.id, next);
    return next;
  }
}

export class MemoryCategoryRepository implements CategoryRepository {
  async listByStore(storeId: string) {
    return [...db.categories.values()]
      .filter((category) => category.storeId === storeId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findById(id: string) {
    return db.categories.get(id) ?? null;
  }

  async findBySlug(storeId: string, slug: string) {
    return (
      [...db.categories.values()].find(
        (category) => category.storeId === storeId && category.slug === slug,
      ) ?? null
    );
  }

  async create(
    input: Omit<Category, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) {
    const category: Category = {
      id: input.id ?? crypto.randomUUID(),
      storeId: input.storeId,
      name: input.name,
      slug: input.slug,
      sortOrder: input.sortOrder,
      imageUrl: input.imageUrl ?? null,
      icon: input.icon ?? null,
      optionSchema: normalizeOptionSchema(input.optionSchema ?? []),
      createdAt: now(),
      updatedAt: now(),
    };
    db.categories.set(category.id, category);
    return category;
  }

  async update(id: string, patch: Partial<Category>) {
    const current = db.categories.get(id);
    if (!current) throw new Error("Category not found");
    const next = { ...current, ...patch, id, updatedAt: now() };
    db.categories.set(id, next);
    return next;
  }

  async delete(id: string) {
    db.categories.delete(id);
  }

  async reorder(storeId: string, orderedIds: string[]) {
    orderedIds.forEach((id, index) => {
      const category = db.categories.get(id);
      if (category && category.storeId === storeId) {
        db.categories.set(id, { ...category, sortOrder: index, updatedAt: now() });
      }
    });
  }
}

export class MemoryProductRepository implements ProductRepository {
  async list(query: ListProductsQuery): Promise<Paginated<ProductWithMedia>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 24;
    let items = [...db.products.values()].filter(
      (product) =>
        product.storeId === query.storeId &&
        statusMatch(product.status, query.status) &&
        matchesSearch(product, query.search) &&
        (query.categoryId ? product.categoryId === query.categoryId : true) &&
        (query.featured === undefined ? true : product.featured === query.featured),
    );
    items = items.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    const total = items.length;
    const start = (page - 1) * pageSize;
    const slice = items.slice(start, start + pageSize).map(withMedia);
    return {
      items: slice,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    };
  }

  async findById(id: string) {
    const product = db.products.get(id);
    return product ? withMedia(product) : null;
  }

  async findBySlug(storeId: string, slug: string) {
    const product = [...db.products.values()].find(
      (item) => item.storeId === storeId && item.slug === slug,
    );
    return product ? withMedia(product) : null;
  }

  async countByStore(storeId: string, statuses?: ProductStatus[]) {
    return [...db.products.values()].filter(
      (product) =>
        product.storeId === storeId &&
        (statuses ? statuses.includes(product.status) : true),
    ).length;
  }

  async create(
    input: Omit<Product, "id" | "createdAt" | "updatedAt" | "publishedAt"> & {
      id?: string;
      publishedAt?: string | null;
    },
  ) {
    const product: Product = {
      id: input.id ?? crypto.randomUUID(),
      storeId: input.storeId,
      categoryId: input.categoryId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      currency: input.currency,
      stock: input.stock,
      status: input.status,
      tags: input.tags,
      specifications: input.specifications,
      featured: input.featured,
      createdAt: now(),
      updatedAt: now(),
      publishedAt: input.publishedAt ?? null,
    };
    db.products.set(product.id, product);
    return product;
  }

  async update(id: string, patch: Partial<Product>) {
    const current = db.products.get(id);
    if (!current) throw new Error("Product not found");
    const next = { ...current, ...patch, id, updatedAt: now() };
    db.products.set(id, next);
    return next;
  }

  async delete(id: string) {
    db.products.delete(id);
    for (const [imageId, image] of db.images) {
      if (image.productId === id) db.images.delete(imageId);
    }
    for (const [variantId, variant] of db.variants) {
      if (variant.productId === id) db.variants.delete(variantId);
    }
  }

  async replaceImages(
    productId: string,
    storeId: string,
    images: Omit<ProductImage, "id">[],
  ) {
    for (const [imageId, image] of db.images) {
      if (image.productId === productId) db.images.delete(imageId);
    }
    const created = images.map((image) => {
      const next: ProductImage = { ...image, id: crypto.randomUUID(), storeId, productId };
      db.images.set(next.id, next);
      return next;
    });
    return created;
  }

  async replaceVariants(
    productId: string,
    storeId: string,
    variants: Omit<ProductVariant, "id">[],
  ) {
    for (const [variantId, variant] of db.variants) {
      if (variant.productId === productId) db.variants.delete(variantId);
    }
    return variants.map((variant) => {
      const next: ProductVariant = {
        ...variant,
        id: crypto.randomUUID(),
        storeId,
        productId,
      };
      db.variants.set(next.id, next);
      return next;
    });
  }
}

export class MemorySubscriptionRepository implements SubscriptionRepository {
  async findByStoreId(storeId: string) {
    return (
      [...db.subscriptions.values()].find((sub) => sub.storeId === storeId) ??
      null
    );
  }

  async create(
    input: Omit<Subscription, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) {
    const sub: Subscription = {
      id: input.id ?? crypto.randomUUID(),
      ...input,
      createdAt: now(),
      updatedAt: now(),
    };
    db.subscriptions.set(sub.id, sub);
    return sub;
  }

  async update(id: string, patch: Partial<Subscription>) {
    const current = db.subscriptions.get(id);
    if (!current) throw new Error("Subscription not found");
    const next = { ...current, ...patch, id, updatedAt: now() };
    db.subscriptions.set(id, next);
    return next;
  }

  async changePlan(storeId: string, planId: PlanId) {
    const current = await this.findByStoreId(storeId);
    if (!current) throw new Error("Subscription not found");
    return this.update(current.id, { planId, status: "active" });
  }
}

export class MemoryAnalyticsRepository implements AnalyticsRepository {
  async track(
    event: Omit<AnalyticsEvent, "id" | "createdAt"> & { id?: string },
  ) {
    db.events.push({
      id: event.id ?? crypto.randomUUID(),
      ...event,
      createdAt: now(),
    });
  }

  async countEvents(storeId: string, eventType: AnalyticsEventType, since: string) {
    return db.events.filter(
      (event) =>
        event.storeId === storeId &&
        event.eventType === eventType &&
        event.createdAt >= since,
    ).length;
  }

  async topProducts(storeId: string, since: string, limit = 5) {
    const counts = new Map<string, number>();
    for (const event of db.events) {
      if (
        event.storeId === storeId &&
        event.eventType === "product_view" &&
        event.productId &&
        event.createdAt >= since
      ) {
        counts.set(event.productId, (counts.get(event.productId) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([productId, views]) => ({ productId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }
}
