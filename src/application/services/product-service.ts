import { AppError } from "@/domain/errors";
import {
  assertCanManageStore,
  assertStoreActive,
  slugify,
} from "@/domain/rules/store-rules";
import type {
  Paginated,
  Product,
  ProductVariant,
  ProductWithMedia,
  Store,
} from "@/domain/types/entities";
import type { ProductStatus } from "@/domain/types/enums";
import type {
  ProductRepository,
  StoreMemberRepository,
  StoreRepository,
} from "@/application/ports/repositories";
import { getPlan, isUnlimited, type PlanLimits } from "@/config/plans";
import {
  countOptionGroups,
  optionGroupLimitMessage,
} from "@/lib/option-limits";
import { visibleProductIds } from "@/domain/plans/access";
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
    const limits = await this.publicLimits(storeId);
    const page = await this.products.list({
      storeId,
      page: 1,
      pageSize: 1000,
      status: "published",
    });
    const allowed = visibleProductIds(page.items, limits.maxProducts);
    const query = options?.search?.trim().toLowerCase();
    const items = page.items
      .filter((item) => allowed.has(item.id))
      .filter((item) => !options?.categoryId || item.categoryId === options.categoryId)
      .filter((item) => !options?.featured || item.featured)
      .filter((item) => !query || item.name.toLowerCase().includes(query))
      .map((item) => this.presentPublic(item, limits));
    return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
  }

  async getPublicBySlug(
    storeId: string,
    productSlug: string,
  ): Promise<ProductWithMedia> {
    const product = await this.products.findBySlug(storeId, productSlug);
    if (!product || product.status !== "published") {
      throw new AppError("NOT_FOUND", "Product not found.");
    }
    if (!(await this.isPubliclyListed(storeId, product.id))) {
      throw new AppError("NOT_FOUND", "Product not found.");
    }
    return this.presentPublic(product, await this.publicLimits(storeId));
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
      if (store?.status === "published") {
        if (await this.isPubliclyListed(storeId, product.id)) {
          return this.presentPublic(product, await this.publicLimits(storeId));
        }
      }
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
    const requestId = data.clientRequestId?.trim();
    if (requestId) {
      const prior = await this.products
        .findByClientRequestId(storeId, requestId)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "";
          if (/client_request_id/i.test(message)) return null;
          throw error;
        });
      if (prior && prior.storeId === storeId) return prior;
    }
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
    const imageCount = data.images?.length ?? 0;
    if (imageCount < 1) {
      throw new AppError("VALIDATION", "Add at least one product image.");
    }
    if (imageCount > maxImages) {
      throw new AppError(
        "LIMIT_REACHED",
        `Your plan allows up to ${maxImages} images per product.`,
      );
    }
    await this.assertProductVariantsAllowed(storeId, data.variants);

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
      clientRequestId: requestId || null,
    });

    try {
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
    } catch (error) {
      await this.products.delete(product.id).catch(() => undefined);
      throw error;
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
    if (data.images) {
      const maxImages = await this.entitlements.maxImagesPerProduct(storeId);
      if (data.images.length < 1) {
        throw new AppError("VALIDATION", "Add at least one product image.");
      }
      if (data.images.length > maxImages) {
        throw new AppError(
          "LIMIT_REACHED",
          `Your plan allows up to ${maxImages} images per product.`,
        );
      }
    }
    if (data.variants) {
      await this.assertProductVariantsAllowed(storeId, data.variants);
    }
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

    let variantsApplied = false;
    try {
      if (data.variants) {
        await this.replaceVariantsSafely(
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
          existing.variants,
        );
        variantsApplied = true;
      }

      if (data.images) {
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

      return await this.products.update(productId, patch);
    } catch (error) {
      if (variantsApplied) {
        await this.restoreVariants(productId, storeId, existing.variants);
      }
      throw error;
    }
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

    const copySuffix = " (copy)";
    return this.create(storeId, {
      name: `${existing.name.slice(0, 160 - copySuffix.length)}${copySuffix}`,
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

  /**
   * Groups (لون، مقاس), not combinations. Rejects before any product write.
   * Free (limit 0) rejects every variant row, matching the database trigger.
   */
  private async assertProductVariantsAllowed(
    storeId: string,
    variants: Array<{ options: Record<string, string> }> | undefined,
  ): Promise<void> {
    if (!variants?.length) return;
    const limit = (await this.entitlements.getLimits(storeId)).maxOptionsPerProduct;
    if (isUnlimited(limit)) return;
    const groups = countOptionGroups(variants);
    if (groups > limit || limit <= 0) {
      throw new AppError("LIMIT_REACHED", optionGroupLimitMessage(limit), {
        details: { limit, groups },
      });
    }
  }

  private async replaceVariantsSafely(
    productId: string,
    storeId: string,
    next: Array<Omit<ProductVariant, "id">>,
    previous: ProductVariant[],
  ): Promise<void> {
    try {
      await this.products.replaceVariants(productId, storeId, next);
    } catch (error) {
      await this.restoreVariants(productId, storeId, previous);
      throw error;
    }
  }

  private async restoreVariants(
    productId: string,
    storeId: string,
    previous: ProductVariant[],
  ): Promise<void> {
    await this.products
      .replaceVariants(
        productId,
        storeId,
        previous.map((variant) => ({
          productId,
          storeId,
          name: variant.name,
          options: variant.options,
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku,
        })),
      )
      .catch(() => undefined);
  }

  private async publicLimits(storeId: string): Promise<PlanLimits> {
    try {
      return await this.entitlements.getLimits(storeId);
    } catch {
      return getPlan("free").limits;
    }
  }

  private async isPubliclyListed(storeId: string, productId: string): Promise<boolean> {
    const limits = await this.publicLimits(storeId);
    const page = await this.products.list({
      storeId,
      page: 1,
      pageSize: 1000,
      status: "published",
    });
    return visibleProductIds(page.items, limits.maxProducts).has(productId);
  }

  private presentPublic(product: ProductWithMedia, limits: PlanLimits): ProductWithMedia {
    const imageLimit = Number.isFinite(limits.maxImagesPerProduct)
      ? limits.maxImagesPerProduct
      : product.images.length;
    const images = [...product.images]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .slice(0, imageLimit);
    const variants = limits.maxOptionsPerProduct === 0 ? [] : product.variants;
    return { ...product, images, variants };
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
