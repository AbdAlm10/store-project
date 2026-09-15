"use client";

import { ImageUploadField } from "@/components/media/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/forms";
import type { Category, CategoryOptionDef } from "@/domain/types/entities";
import {
  createProductAction,
  updateProductAction,
} from "@/features/products/actions";
import { useI18n } from "@/i18n/provider";
import {
  buildVariantMatrix,
  pruneVariantsToSchema,
} from "@/lib/category-options";
import { MIN_PRODUCT_DESCRIPTION_LENGTH } from "@/validations/schemas";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type VariantDraft = {
  name: string;
  options: Record<string, string>;
  price: string;
  stock: string;
};

type ProductFormProps = {
  storeId: string;
  categories: Category[];
  productId?: string;
  initial?: {
    name: string;
    description: string;
    price: number;
    compareAtPrice: number | null;
    stock: number | null;
    categoryId: string | null;
    status: string;
    tags: string;
    imageUrls?: string[];
    /** @deprecated use imageUrls */
    imageUrl?: string;
    featured: boolean;
    variants?: Array<{
      name: string;
      options: Record<string, string>;
      price: number | null;
      stock: number | null;
    }>;
  };
};

const PRODUCT_IMAGE_SLOTS = 3;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[1.35rem] border border-slate-100/80 bg-white p-4 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ProductForm({
  storeId,
  categories,
  productId,
  initial,
}: ProductFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState<"draft" | "publish" | "save">("save");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [variants, setVariants] = useState<VariantDraft[]>(
    () =>
      initial?.variants?.map((variant) => ({
        name: variant.name,
        options: variant.options,
        price: variant.price != null ? String(variant.price) : "",
        stock: variant.stock != null ? String(variant.stock) : "",
      })) ?? [],
  );
  const [imageUrls, setImageUrls] = useState<string[]>(() => {
    const fromList = initial?.imageUrls?.filter(Boolean) ?? [];
    const legacy = initial?.imageUrl?.trim() ? [initial.imageUrl.trim()] : [];
    const seeds = (fromList.length ? fromList : legacy).slice(
      0,
      PRODUCT_IMAGE_SLOTS,
    );
    return Array.from(
      { length: PRODUCT_IMAGE_SLOTS },
      (_, index) => seeds[index] ?? "",
    );
  });

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const optionSchema: CategoryOptionDef[] =
    selectedCategory?.optionSchema ?? [];
  const [prunedCount, setPrunedCount] = useState(0);

  const schemaKey = useMemo(
    () =>
      JSON.stringify(
        optionSchema.map((opt) => ({
          name: opt.name,
          values: opt.values.map((value) => value.label),
        })),
      ),
    [optionSchema],
  );

  // Drop variant rows that no longer match the category Color/Size options.
  useEffect(() => {
    if (!optionSchema.length) return;
    setVariants((list) => {
      const next = pruneVariantsToSchema(list, optionSchema);
      const removed = list.length - next.length;
      if (removed > 0) setPrunedCount((count) => count + removed);
      return removed > 0 ? next : list;
    });
    // schemaKey captures optionSchema contents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, schemaKey]);

  function buildPayload(formData: FormData, statusOverride?: string) {
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const name = String(formData.get("name") ?? "");
    const images = imageUrls
      .map((url) => url.trim())
      .filter(Boolean)
      .slice(0, PRODUCT_IMAGE_SLOTS)
      .map((url, index) => ({
        url,
        alt: name,
        sortOrder: index,
      }));
    return {
      name,
      description: String(formData.get("description") ?? "").trim(),
      price: Number(formData.get("price") ?? 0),
      compareAtPrice: formData.get("compareAtPrice")
        ? Number(formData.get("compareAtPrice"))
        : null,
      stock: formData.get("stock") ? Number(formData.get("stock")) : null,
      categoryId: categoryId || null,
      status:
        statusOverride ??
        String(formData.get("status") ?? initial?.status ?? "draft"),
      tags,
      featured: formData.get("featured") === "on",
      images,
      variants: pruneVariantsToSchema(variants, optionSchema).map(
        (variant) => ({
          name: variant.name,
          options: variant.options,
          price: variant.price ? Number(variant.price) : null,
          stock: variant.stock ? Number(variant.stock) : null,
          sku: null,
        }),
      ),
    };
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const statusOverride =
          intent === "draft"
            ? "draft"
            : intent === "publish"
              ? "published"
              : undefined;
        const payload = buildPayload(formData, statusOverride);
        if (!payload.images.length) {
          setError(t("productImageRequired"));
          return;
        }
        if (payload.description.length < MIN_PRODUCT_DESCRIPTION_LENGTH) {
          setError(
            t("descriptionTooShort", { min: MIN_PRODUCT_DESCRIPTION_LENGTH }),
          );
          return;
        }

        setError(null);
        startTransition(async () => {
          const result = productId
            ? await updateProductAction(storeId, productId, payload)
            : await createProductAction(storeId, payload);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push("/dashboard/products");
          router.refresh();
        });
      }}
    >
      <Section title={t("sectionProductInfo")}>
        <div>
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" required defaultValue={initial?.name} />
        </div>
        <div>
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea
            id="description"
            name="description"
            required
            minLength={MIN_PRODUCT_DESCRIPTION_LENGTH}
            defaultValue={initial?.description}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            {t("descriptionMinHint", { min: MIN_PRODUCT_DESCRIPTION_LENGTH })}
          </p>
        </div>
      </Section>

      <Section title={t("sectionPricing")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="price">{t("price")}</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={initial?.price ?? 0}
            />
          </div>
          <div>
            <Label htmlFor="compareAtPrice">{t("compareAtPrice")}</Label>
            <Input
              id="compareAtPrice"
              name="compareAtPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial?.compareAtPrice ?? undefined}
            />
          </div>
        </div>
      </Section>

      <Section
        title={t("sectionInventory")}
        description={t("sectionInventoryHint")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="stock">{t("stock")}</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              min="0"
              defaultValue={initial?.stock ?? undefined}
            />
          </div>
          <div>
            <Label htmlFor="categoryId">{t("category")}</Label>
            <Select
              id="categoryId"
              name="categoryId"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">{t("uncategorized")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.optionSchema.length
                    ? ` (${category.optionSchema.length})`
                    : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="tags">{t("tags")}</Label>
          <Input id="tags" name="tags" defaultValue={initial?.tags} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={initial?.featured}
          />
          {t("featuredOnStorefront")}
        </label>
      </Section>

      <Section title={t("variantsSection")} description={t("variantsHint")}>
        {optionSchema.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const matrix = buildVariantMatrix(optionSchema);
                setVariants(
                  matrix.map((item) => ({
                    name: item.name,
                    options: item.options,
                    price: "",
                    stock: "",
                  })),
                );
                setPrunedCount(0);
              }}
            >
              {t("generateVariants")}
            </Button>
            <p className="w-full text-xs text-slate-500">
              {optionSchema
                .map(
                  (opt) =>
                    `${opt.name}: ${opt.values.map((value) => value.label).join("/")}`,
                )
                .join(" · ")}
            </p>
            {prunedCount > 0 ? (
              <p className="w-full rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
                {t("variantsPrunedNotice").replace(
                  "{count}",
                  String(prunedCount),
                )}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t("variantsHint")}</p>
        )}

        {variants.length > 0 ? (
          <ul className="space-y-2">
            {variants.map((variant, index) => (
              <li
                key={`${variant.name}-${index}`}
                className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:grid-cols-[1fr_6rem_6rem_auto]"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {variant.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {Object.entries(variant.options)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(" · ")}
                  </p>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("price")}
                  value={variant.price}
                  onChange={(event) =>
                    setVariants((list) =>
                      list.map((item, i) =>
                        i === index
                          ? { ...item, price: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <Input
                  type="number"
                  min="0"
                  placeholder={t("stock")}
                  value={variant.stock}
                  onChange={(event) =>
                    setVariants((list) =>
                      list.map((item, i) =>
                        i === index
                          ? { ...item, stock: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600"
                  onClick={() =>
                    setVariants((list) => list.filter((_, i) => i !== index))
                  }
                >
                  {t("delete")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title={t("sectionImages")} description={t("sectionImagesHint")}>
        <div className="grid gap-4 sm:grid-cols-3">
          {imageUrls.map((url, index) => (
            <div key={index} className="space-y-2">
              <Label>
                {index === 0
                  ? `${t("primaryImageUrl")} *`
                  : `${t("optionalImage")} ${index}`}
              </Label>
              <ImageUploadField
                storeId={storeId}
                kind="product"
                compact
                value={url}
                onChange={(next) =>
                  setImageUrls((list) =>
                    list.map((item, i) => (i === index ? next : item)),
                  )
                }
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">{t("imageCompressHint")}</p>
      </Section>

      <Section title={t("sectionVisibility")}>
        <div>
          <Label htmlFor="status">{t("status")}</Label>
          <Select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "draft"}
          >
            <option value="draft">{t("draft")}</option>
            <option value="published">{t("published")}</option>
            <option value="hidden">{t("hidden")}</option>
            <option value="archived">{t("archived")}</option>
          </Select>
        </div>
      </Section>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={pending}
          onClick={() => setIntent("save")}
        >
          {pending ? t("saving") : productId ? t("saveChanges") : t("save")}
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          onClick={() => setIntent("draft")}
        >
          {t("saveAsDraft")}
        </Button>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          onClick={() => setIntent("publish")}
        >
          {t("saveAndPublish")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => router.push("/dashboard/products")}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
