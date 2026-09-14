import { AppError } from "@/domain/errors";
import {
  assertCanManageStore,
  assertStoreActive,
  slugify,
} from "@/domain/rules/store-rules";
import type { Category } from "@/domain/types/entities";
import type {
  CategoryRepository,
  StoreMemberRepository,
  StoreRepository,
} from "@/application/ports/repositories";
import { categorySchema } from "@/validations/schemas";
import type { AuthService } from "./auth-service";

export class CategoryService {
  constructor(
    private readonly auth: AuthService,
    private readonly stores: StoreRepository,
    private readonly members: StoreMemberRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async listPublic(storeId: string): Promise<Category[]> {
    return this.categories.listByStore(storeId);
  }

  async listForMerchant(storeId: string): Promise<Category[]> {
    await this.requireManager(storeId);
    return this.categories.listByStore(storeId);
  }

  async create(storeId: string, input: unknown): Promise<Category> {
    const store = await this.requireManager(storeId);
    assertStoreActive(store);
    const data = categorySchema.parse(input);
    const baseSlug = data.slug ?? slugify(data.name);
    const slug =
      baseSlug ||
      `cat-${Date.now().toString(36)}`;
    const existing = await this.categories.findBySlug(storeId, slug);
    if (existing) {
      throw new AppError("CONFLICT", "A category with this slug already exists.");
    }
    const current = await this.categories.listByStore(storeId);
    return this.categories.create({
      storeId,
      name: data.name,
      slug,
      sortOrder: current.length,
      imageUrl: data.imageUrl ?? null,
      icon: data.icon ?? null,
      optionSchema: data.optionSchema ?? [],
    });
  }

  async updateOptions(
    storeId: string,
    categoryId: string,
    input: unknown,
  ): Promise<Category> {
    await this.requireManager(storeId);
    const data = categorySchema.parse(input);
    const category = await this.categories.findById(categoryId);
    if (!category || category.storeId !== storeId) {
      throw new AppError("NOT_FOUND", "Category not found.");
    }
    return this.categories.update(categoryId, {
      name: data.name,
      imageUrl:
        data.imageUrl !== undefined ? data.imageUrl : category.imageUrl,
      icon: data.icon !== undefined ? data.icon : category.icon,
      optionSchema: data.optionSchema ?? category.optionSchema,
    });
  }

  async rename(storeId: string, categoryId: string, input: unknown): Promise<Category> {
    await this.requireManager(storeId);
    const data = categorySchema.parse(input);
    const category = await this.categories.findById(categoryId);
    if (!category || category.storeId !== storeId) {
      throw new AppError("NOT_FOUND", "Category not found.");
    }
    const generated = slugify(data.name);
    const nextSlug = data.slug ?? (generated || category.slug);
    return this.categories.update(categoryId, {
      name: data.name,
      slug: nextSlug,
      ...(data.optionSchema !== undefined
        ? { optionSchema: data.optionSchema }
        : {}),
    });
  }

  async delete(storeId: string, categoryId: string): Promise<void> {
    await this.requireManager(storeId);
    const category = await this.categories.findById(categoryId);
    if (!category || category.storeId !== storeId) {
      throw new AppError("NOT_FOUND", "Category not found.");
    }
    await this.categories.delete(categoryId);
  }

  async reorder(storeId: string, orderedIds: string[]): Promise<void> {
    await this.requireManager(storeId);
    await this.categories.reorder(storeId, orderedIds);
  }

  private async requireManager(storeId: string) {
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "staff");
    return store;
  }
}
