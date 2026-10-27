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
import { countOptionGroups } from "@/lib/option-limits";
import {
  countWords,
  MIN_PRODUCT_DESCRIPTION_WORDS,
} from "@/validations/schemas";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  /** Plan limit for product images (defaults fail-closed to Basic). */
  maxImagesPerProduct?: number;
  /** Option groups, not combinations. null means unlimited. */
  maxOptionsPerProduct?: number | null;
  variantsEnabled?: boolean;
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
  maxImagesPerProduct = 3,
  maxOptionsPerProduct = 3,
  variantsEnabled = true,
  initial,
}: ProductFormProps) {
  const imageSlots = Math.max(1, maxImagesPerProduct);
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitLock = useRef(false);
  const requestIdRef = useRef(
    globalThis.crypto?.randomUUID?.() ?? `req-${Date.now().toString(36)}`,
  );
  const [intent, setIntent] = useState<"archive" | "publish" | "save">("save");
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
    const seeds = (fromList.length ? fromList : legacy).slice(0, imageSlots);
    return Array.from({ length: imageSlots }, (_, index) => seeds[index] ?? "");
  });

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const optionSchema: CategoryOptionDef[] =
    selectedCategory?.optionSchema ?? [];
  const [prunedCount, setPrunedCount] = useState(0);
  const [uploadingSlots, setUploadingSlots] = useState<Record<number, boolean>>(
    {},
  );
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string[]>>(
    {},
  );
  const uploading = Object.values(uploadingSlots).some(Boolean);

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

  // Drop variant rows that no longer match the category option groups.
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
      .slice(0, imageSlots)
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
        String(formData.get("status") ?? initial?.status ?? "published"),
      tags,
      featured: formData.get("featured") === "on",
      images,
      variants: variantsEnabled
        ? pruneVariantsToSchema(variants, optionSchema).map((variant) => ({
            name: variant.name,
            options: variant.options,
            price: variant.price ? Number(variant.price) : null,
            stock: variant.stock ? Number(variant.stock) : null,
            sku: null,
          }))
        : undefined,
    };
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (submitLock.current || uploading) {
          if (uploading) setError(t("waitForImageUpload"));
          return;
        }
        const formData = new FormData(event.currentTarget);
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const action =
          submitter instanceof HTMLButtonElement && submitter.value
            ? submitter.value
            : intent;
        const statusOverride =
          action === "archive"
            ? "archived"
            : action === "publish"
              ? "published"
              : undefined;
        const payload = {
          ...buildPayload(formData, statusOverride),
          ...(productId ? {} : { clientRequestId: requestIdRef.current }),
        };
        if (!payload.name.trim()) {
          setError(t("productNameRequired"));
          return;
        }
        if (!payload.images.length) {
          setError(t("productImageRequired"));
          return;
        }
        if (countWords(payload.description) < MIN_PRODUCT_DESCRIPTION_WORDS) {
          setError(
            t("descriptionTooShort", { min: MIN_PRODUCT_DESCRIPTION_WORDS }),
          );
          return;
        }
        if (
          payload.variants &&
          maxOptionsPerProduct != null &&
          (maxOptionsPerProduct <= 0 ||
            countOptionGroups(payload.variants) > maxOptionsPerProduct)
        ) {
          setError(t("optionLimitReached", { count: maxOptionsPerProduct }));
          return;
        }

        setError(null);
        if (action === "archive" || action === "publish" || action === "save") {
          setIntent(action);
        }
        submitLock.current = true;
        setPending(true);
        void (async () => {
          try {
            const result = productId
              ? await updateProductAction(storeId, productId, payload)
              : await createProductAction(storeId, payload);
            if (!result.ok) {
              setError(result.error);
              submitLock.current = false;
              setPending(false);
              return;
            }
            router.push("/dashboard/products");
            router.refresh();
          } catch {
            submitLock.current = false;
            setPending(false);
          }
        })();
      }}
    >
      <Section title={t("sectionProductInfo")}>
        <div>
          <Label htmlFor="name">{t("name")}</Label>
          <Input id="name" name="name" defaultValue={initial?.name} />
        </div>
        <div>
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={initial?.description}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            {t("descriptionMinHint", { min: MIN_PRODUCT_DESCRIPTION_WORDS })}
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

      {variantsEnabled ? (
      <Section title={t("variantsSection")} description={t("variantsHint")}>
        {optionSchema.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {optionSchema.map((opt) =>
              opt.values.length === 0 ? null : (
                <div key={opt.id} className="w-full space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500">
                    {opt.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {opt.values.map((value) => {
                      const selected = (selectedLabels[opt.name] ?? []).includes(
                        value.label,
                      );
                      return (
                        <button
                          key={`${opt.id}-${value.label}`}
                          type="button"
                          aria-pressed={selected}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
                            selected
                              ? "bg-brand-700 text-white ring-brand-700"
                              : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                          )}
                          onClick={() =>
                            setSelectedLabels((current) => {
                              const list = current[opt.name] ?? [];
                              const next = list.includes(value.label)
                                ? list.filter((item) => item !== value.label)
                                : [...list, value.label];
                              return { ...current, [opt.name]: next };
                            })
                          }
                        >
                          {value.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const axes = optionSchema.filter((opt) => opt.values.length > 0);
                if (
                  maxOptionsPerProduct != null &&
                  axes.length > maxOptionsPerProduct
                ) {
                  setError(
                    t("optionLimitReached", { count: maxOptionsPerProduct }),
                  );
                  return;
                }
                const missing = axes.some(
                  (opt) => (selectedLabels[opt.name] ?? []).length === 0,
                );
                if (missing) {
                  setError(t("pickVariantValuesHint"));
                  return;
                }
                const narrowed = optionSchema.map((opt) => ({
                  ...opt,
                  values: opt.values.filter((value) =>
                    (selectedLabels[opt.name] ?? []).includes(value.label),
                  ),
                }));
                const matrix = buildVariantMatrix(narrowed);
                const priceField = document.getElementById("price");
                const typed =
                  priceField instanceof HTMLInputElement
                    ? priceField.value.trim()
                    : "";
                const price = typed || String(initial?.price ?? "");
                setError(null);
                setVariants(
                  matrix.map((item) => ({
                    name: item.name,
                    options: item.options,
                    price,
                    stock: "",
                  })),
                );
                setPrunedCount(0);
              }}
            >
              {t("generateSelectedVariants")}
            </Button>
            <p className="w-full text-xs text-slate-500">
              {t("pickVariantValuesHint")}
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
      ) : (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t("freeVariantsLocked")}
        </p>
      )}

      <Section
        title={t("sectionImages")}
        description={t("sectionImagesHintLimited", { count: imageSlots })}
      >
        <div
          className={cn(
            "grid gap-4",
            imageSlots <= 2 ? "sm:grid-cols-2" : "sm:grid-cols-3",
          )}
        >
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
                onBusyChange={(busy) =>
                  setUploadingSlots((current) => ({
                    ...current,
                    [index]: busy,
                  }))
                }
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

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          value="save"
          disabled={pending || uploading}
          onClick={() => setIntent("save")}
        >
          {pending && intent === "save" ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : null}
          {pending && intent === "save"
            ? t("saving")
            : productId
              ? t("saveChanges")
              : t("save")}
        </Button>
        <Button
          type="submit"
          value="archive"
          variant="outline"
          disabled={pending || uploading}
          onClick={() => setIntent("archive")}
        >
          {pending && intent === "archive" ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
          ) : null}
          {pending && intent === "archive" ? t("archiving") : t("archive")}
        </Button>
        <Button
          type="submit"
          value="publish"
          variant="secondary"
          disabled={pending || uploading}
          onClick={() => setIntent("publish")}
        >
          {pending && intent === "publish" ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
          ) : null}
          {pending && intent === "publish" ? t("saving") : t("saveAndPublish")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending || uploading}
          onClick={() => router.push("/dashboard/products")}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
