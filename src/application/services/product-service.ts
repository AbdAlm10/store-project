import { AppError } from "@/domain/errors";
import {
  assertCanManageStore,
  assertStoreActive,
  slugify,
} from "@/domain/rules/store-rules";
import type {
  Paginated,
  Product,
  ProductWithMedia,
  Store,
} from "@/domain/types/entities";
import type { ProductStatus } from "@/domain/types/enums";
import type {
  ProductRepository,
  StoreMemberRepository,
  StoreRepository,
} from "@/application/ports/repositories";
import { productSchema } from "@/validations/schemas";
import type { AuthService } from "./auth-service";
import type { EntitlementService } from "./entitlement-service";

export class ProductService {
  constructor(
    private readonly auth: AuthService,
    private readonly stores: StoreRepository,
    private readonly members: StoreMemberRepository,
    private readonly products: ProductRepository,
    private readonly entitlements: EntitlementService,
  ) {}

  async listPublic(
    storeId: string,
    options?: {
      page?: number;
      pageSize?: number;
      categoryId?: string;
      search?: string;
      featured?: boolean;
    },
  ): Promise<Paginated<ProductWithMedia>> {
    return this.products.list({
      storeId,
      page: options?.page ?? 1,
      pageSize: options?.pageSize ?? 24,
      categoryId: options?.categoryId,
      search: options?.search,
      featured: options?.featured,
      status: "published",
    });
  }

  async getPublicBySlug(
    storeId: string,
    productSlug: string,
  ): Promise<ProductWithMedia> {
    const product = await this.products.findBySlug(storeId, productSlug);
    if (!product || product.status !== "published") {
      throw new AppError("NOT_FOUND", "Product not found.");
    }
    return product;
  }

  /**
   * Public visitors: published products only.
   * Store members can preview draft/hidden products (and products on draft stores).
   */
  async getStorefrontBySlug(
    storeId: string,
    productSlug: string,
  ): Promise<ProductWithMedia> {
    const product = await this.products.findBySlug(storeId, productSlug);
    if (!product || product.status === "archived") {
      throw new AppError("NOT_FOUND", "Product not found.");
    }

    if (product.status === "published") {
      const store = await this.stores.findById(storeId);
      if (store?.status === "published") return product;
    }

    try {
      const { session } = await this.auth.requireProfile();
      const membership = await this.members.findMembership(
        storeId,
        session.user.id,
      );
      if (membership) return product;
    } catch {
      // anonymous
    }

    throw new AppError("NOT_FOUND", "Product not found.");
  }

  async listForMerchant(
    storeId: string,
    options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: ProductStatus | ProductStatus[];
    },
  ): Promise<Paginated<ProductWithMedia>> {
    await this.requireStaff(storeId);
    return this.products.list({
      storeId,
      page: options?.page ?? 1,
      pageSize: options?.pageSize ?? 20,
      search: options?.search,
      status: options?.status,
    });
  }

  async create(storeId: string, input: unknown): Promise<Product> {
    const store = await this.requireStaff(storeId);
    assertStoreActive(store);
    const data = productSchema.parse(input);
    const count = await this.products.countByStore(storeId);
    await this.entitlements.assertCanCreateProduct(storeId, count);

    const generatedSlug = slugify(data.name);
    const slug = data.slug ?? (generatedSlug || `product-${Date.now().toString(36)}`);
    if (slug.length < 2) {
      throw new AppError(
        "VALIDATION",
        "Product URL slug is invalid. Add a Latin slug or English name.",
      );
    }
    const existing = await this.products.findBySlug(storeId, slug);
    if (existing) {
      throw new AppError("CONFLICT", "A product with this slug already exists.");
    }

    const maxImages = await this.entitlements.maxImagesPerProduct(storeId);
    if ((data.images?.length ?? 0) > maxImages) {
      throw new AppError(
        "LIMIT_REACHED",
        `Your plan allows up to ${maxImages} images per product.`,
      );
    }

    const status = data.status ?? "draft";
    const product = await this.products.create({
      storeId,
      categoryId: data.categoryId ?? null,
      name: data.name,
      slug,
      description: data.description ?? null,
      price: data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      currency: store.currency,
      stock: data.stock ?? null,
      status,
      tags: data.tags ?? [],
      specifications: data.specifications ?? {},
      featured: data.featured ?? false,
      publishedAt: status === "published" ? new Date().toISOString() : null,
    });

    if (data.images?.length) {
      await this.products.replaceImages(
        product.id,
        storeId,
        data.images.map((image) => ({
          productId: product.id,
          storeId,
          url: image.url,
          alt: image.alt ?? null,
          sortOrder: image.sortOrder,
          width: null,
          height: null,
        })),
      );
    }

    if (data.variants?.length) {
      await this.products.replaceVariants(
        product.id,
        storeId,
        data.variants.map((variant) => ({
          productId: product.id,
          storeId,
          name: variant.name,
          options: variant.options,
          price: variant.price ?? null,
          stock: variant.stock ?? null,
          sku: variant.sku ?? null,
        })),
      );
    }

    return product;
  }

  async update(
    storeId: string,
    productId: string,
    input: unknown,
  ): Promise<Product> {
    const store = await this.requireStaff(storeId);
    assertStoreActive(store);
    const existing = await this.products.findById(productId);
    if (!existing || existing.storeId !== storeId) {
      throw new AppError("NOT_FOUND", "Product not found.");
    }

    const data = productSchema.partial().parse(input);
    const patch: Partial<Product> = {};

    if (data.name !== undefined) patch.name = data.name;
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.description !== undefined) patch.description = data.description;
    if (data.price !== undefined) patch.price = data.price;
    if (data.compareAtPrice !== undefined) {
      patch.compareAtPrice = data.compareAtPrice;
    }
    if (data.stock !== undefined) patch.stock = data.stock;
    if (data.categoryId !== undefined) patch.categoryId = data.categoryId;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.specifications !== undefined) {
      patch.specifications = data.specifications;
    }
    if (data.featured !== undefined) patch.featured = data.featured;
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === "published" && existing.status !== "published") {
        patch.publishedAt = new Date().toISOString();
      }
    }

    const updated = await this.products.update(productId, patch);

    if (data.images) {
      const maxImages = await this.entitlements.maxImagesPerProduct(storeId);
      if (data.images.length > maxImages) {
        throw new AppError(
          "LIMIT_REACHED",
          `Your plan allows up to ${maxImages} images per product.`,
        );
      }
      await this.products.replaceImages(
        productId,
        storeId,
        data.images.map((image) => ({
          productId,
          storeId,
          url: image.url,
          alt: image.alt ?? null,
          sortOrder: image.sortOrder,
          width: null,
          height: null,
        })),
      );
    }

    if (data.variants) {
      await this.products.replaceVariants(
        productId,
        storeId,
        data.variants.map((variant) => ({
          productId,
          storeId,
          name: variant.name,
          options: variant.options,
          price: variant.price ?? null,
          stock: variant.stock ?? null,
          sku: variant.sku ?? null,
        })),
      );
    }

    return updated;
  }

  async delete(storeId: string, productId: string): Promise<void> {
    await this.requireStaff(storeId);
    const existing = await this.products.findById(productId);
    if (!existing || existing.storeId !== storeId) {
      throw new AppError("NOT_FOUND", "Product not found.");
    }
    await this.products.delete(productId);
  }

  async duplicate(storeId: string, productId: string): Promise<Product> {
    const existing = await this.products.findById(productId);
    if (!existing || existing.storeId !== storeId) {
      throw new AppError("NOT_FOUND", "Product not found.");
    }
    const count = await this.products.countByStore(storeId);
    await this.entitlements.assertCanCreateProduct(storeId, count);

    return this.create(storeId, {
      name: `${existing.name} (copy)`,
      description: existing.description,
      price: existing.price,
      compareAtPrice: existing.compareAtPrice,
      stock: existing.stock,
      categoryId: existing.categoryId,
      status: "draft",
      tags: existing.tags,
      specifications: existing.specifications,
      featured: false,
      images: existing.images.map((image, index) => ({
        url: image.url,
        alt: image.alt,
        sortOrder: index,
      })),
      variants: existing.variants.map((variant) => ({
        name: variant.name,
        options: variant.options,
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku,
      })),
    });
  }

  private async requireStaff(storeId: string): Promise<Store> {
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "staff");
    return store;
  }
}
