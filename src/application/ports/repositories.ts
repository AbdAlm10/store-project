import type {
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
  AnalyticsEvent,
} from "@/domain/types/entities";
import type { AnalyticsEventType, ProductStatus } from "@/domain/types/enums";
import type { PlanId } from "@/config/plans";

export type ListProductsQuery = {
  storeId: string;
  page?: number;
  pageSize?: number;
  categoryId?: string | null;
  status?: ProductStatus | ProductStatus[];
  search?: string;
  featured?: boolean;
};

export interface UserRepository {
  findProfileById(id: string): Promise<Profile | null>;
  upsertProfile(profile: Omit<Profile, "createdAt" | "updatedAt"> & Partial<Pick<Profile, "createdAt" | "updatedAt">>): Promise<Profile>;
  setSuspended(userId: string, suspended: boolean): Promise<void>;
}

export interface StoreRepository {
  findById(id: string): Promise<Store | null>;
  findBySlug(slug: string): Promise<Store | null>;
  listByUserId(userId: string): Promise<Store[]>;
  create(input: Omit<Store, "createdAt" | "updatedAt" | "publishedAt" | "suspendedAt"> & { publishedAt?: string | null; suspendedAt?: string | null }): Promise<Store>;
  update(id: string, patch: Partial<Store>): Promise<Store>;
  slugExists(slug: string, excludeId?: string): Promise<boolean>;
}

export interface StoreMemberRepository {
  findMembership(storeId: string, userId: string): Promise<StoreMember | null>;
  listByStore(storeId: string): Promise<StoreMember[]>;
  create(member: Omit<StoreMember, "id" | "createdAt"> & { id?: string }): Promise<StoreMember>;
}

export interface CategoryRepository {
  listByStore(storeId: string): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findBySlug(storeId: string, slug: string): Promise<Category | null>;
  create(input: Omit<Category, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Category>;
  update(id: string, patch: Partial<Category>): Promise<Category>;
  delete(id: string): Promise<void>;
  reorder(storeId: string, orderedIds: string[]): Promise<void>;
}

export interface ProductRepository {
  list(query: ListProductsQuery): Promise<Paginated<ProductWithMedia>>;
  findById(id: string): Promise<ProductWithMedia | null>;
  findBySlug(storeId: string, slug: string): Promise<ProductWithMedia | null>;
  countByStore(storeId: string, statuses?: ProductStatus[]): Promise<number>;
  create(input: Omit<Product, "id" | "createdAt" | "updatedAt" | "publishedAt"> & { id?: string; publishedAt?: string | null }): Promise<Product>;
  update(id: string, patch: Partial<Product>): Promise<Product>;
  delete(id: string): Promise<void>;
  replaceImages(productId: string, storeId: string, images: Omit<ProductImage, "id">[]): Promise<ProductImage[]>;
  replaceVariants(productId: string, storeId: string, variants: Omit<ProductVariant, "id">[]): Promise<ProductVariant[]>;
}

export interface SubscriptionRepository {
  findByStoreId(storeId: string): Promise<Subscription | null>;
  create(input: Omit<Subscription, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Subscription>;
  update(id: string, patch: Partial<Subscription>): Promise<Subscription>;
  changePlan(storeId: string, planId: PlanId): Promise<Subscription>;
}

export interface AnalyticsRepository {
  track(event: Omit<AnalyticsEvent, "id" | "createdAt"> & { id?: string }): Promise<void>;
  countEvents(
    storeId: string,
    eventType: AnalyticsEventType,
    since: string,
  ): Promise<number>;
  topProducts(
    storeId: string,
    since: string,
    limit?: number,
  ): Promise<Array<{ productId: string; views: number }>>;
}
