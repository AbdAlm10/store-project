"use client";

import { PageHeader, StatusBadge } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/forms";
import { SafeImage } from "@/components/ui/safe-image";
import type { Category, ProductWithMedia } from "@/domain/types/entities";
import type { ProductStatus } from "@/domain/types/enums";
import {
  bulkDeleteProductsAction,
  bulkUpdateProductStatusAction,
} from "@/features/products/actions";
import { ProductActions } from "@/features/products/product-actions";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { formatMoney } from "@/lib/social/sharing";
import { cn } from "@/lib/utils/cn";
import {
  Archive,
  EyeOff,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

function productCategoryName(
  product: ProductWithMedia,
  categoriesById: Map<string, Category>,
  uncategorized: string,
) {
  if (product.category?.name) return product.category.name;
  if (product.categoryId) {
    return categoriesById.get(product.categoryId)?.name ?? uncategorized;
  }
  return uncategorized;
}

type BulkAction = "publish" | "hide" | "archive" | "delete";

export function ProductsWorkspace({
  storeId,
  storeSlug,
  products,
  categories,
  locale,
}: {
  storeId: string;
  storeSlug: string;
  products: ProductWithMedia[];
  categories: Category[];
  locale: Locale;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<"" | ProductStatus>("");
  const [categoryId, setCategoryId] = useState("");
  const [navigating, startNavigate] = useTransition();
  const [bulkPending, startBulk] = useTransition();
  const [bulkBusy, setBulkBusy] = useState<BulkAction | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return products.filter((product) => {
      if (status && product.status !== status) return false;
      if (categoryId === "__none__") {
        if (product.categoryId) return false;
      } else if (categoryId && product.categoryId !== categoryId) {
        return false;
      }
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        (product.description?.toLowerCase().includes(q) ?? false) ||
        product.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        product.slug.toLowerCase().includes(q)
      );
    });
  }, [products, deferredSearch, status, categoryId]);

  const filteredIds = useMemo(
    () => filtered.map((product) => product.id),
    [filtered],
  );

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const allowed = new Set(filteredIds);
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredIds]);

  const selectedCount = selected.size;
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someFilteredSelected =
    !allFilteredSelected && filteredIds.some((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of filteredIds) next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function runBulk(action: BulkAction) {
    const ids = [...selected];
    if (ids.length === 0) return;

    if (action === "delete") {
      if (!confirm(t("bulkDeleteConfirm", { count: ids.length }))) return;
    }

    setBulkBusy(action);
    startBulk(async () => {
      try {
        if (action === "delete") {
          await bulkDeleteProductsAction(storeId, ids);
        } else {
          const statusMap = {
            publish: "published",
            hide: "hidden",
            archive: "archived",
          } as const;
          await bulkUpdateProductStatusAction(storeId, ids, statusMap[action]);
        }
        clearSelection();
        router.refresh();
      } finally {
        setBulkBusy(null);
      }
    });
  }

  const hasFilters = Boolean(search || status || categoryId);
  const bulkDisabled = bulkPending || selectedCount === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("products")}
        description={t("productsPageDesc")}
        actions={
          <Button
            disabled={navigating}
            onClick={() =>
              startNavigate(() => {
                router.push("/dashboard/products/new");
              })
            }
          >
            {navigating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {navigating ? t("loading") : t("addProduct")}
          </Button>
        }
      />

      <DashboardCard padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={1.75}
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchProductsPlaceholder")}
              aria-label={t("searchProductsAria")}
              className="ps-9"
            />
          </div>
          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-label={t("filterByCategory")}
            className="sm:w-44"
          >
            <option value="">{t("allProductCategories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value="__none__">{t("uncategorized")}</option>
          </Select>
          <Select
            value={status}
            onChange={(event) =>
              setStatus((event.target.value || "") as "" | ProductStatus)
            }
            aria-label={t("filterByStatus")}
            className="sm:w-44"
          >
            <option value="">{t("allStatuses")}</option>
            <option value="published">{t("published")}</option>
            <option value="hidden">{t("hidden")}</option>
            <option value="archived">{t("archived")}</option>
            <option value="draft">{t("draft")}</option>
          </Select>
        </div>
      </DashboardCard>

      {selectedCount > 0 ? (
        <div className="sticky top-2 z-20 flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white/95 p-3 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span>{t("selectedCount", { count: selectedCount })}</span>
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkPending}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-slate-50 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              {t("clearSelection")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={bulkDisabled}
              onClick={() => runBulk("publish")}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
            >
              {bulkBusy === "publish" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {bulkBusy === "publish" ? t("bulkWorking") : t("publish")}
            </button>
            <button
              type="button"
              disabled={bulkDisabled}
              onClick={() => runBulk("hide")}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {bulkBusy === "hide" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {bulkBusy === "hide" ? t("bulkWorking") : t("hide")}
            </button>
            <button
              type="button"
              disabled={bulkDisabled}
              onClick={() => runBulk("archive")}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
            >
              {bulkBusy === "archive" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {bulkBusy === "archive" ? t("bulkWorking") : t("archive")}
            </button>
            <button
              type="button"
              disabled={bulkDisabled}
              onClick={() => runBulk("delete")}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-50 px-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              {bulkBusy === "delete" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {bulkBusy === "delete" ? t("deleting") : t("delete")}
            </button>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? t("emptyMatchingProducts") : t("emptyProducts")}
          description={
            hasFilters ? t("emptyMatchingHint") : t("emptyProductsHint")
          }
          action={
            <Button
              disabled={navigating}
              onClick={() =>
                startNavigate(() => {
                  router.push("/dashboard/products/new");
                })
              }
            >
              {navigating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("addProduct")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {filtered.map((product) => {
              const image = product.images[0];
              const categoryName = productCategoryName(
                product,
                categoriesById,
                t("uncategorized"),
              );
              const isChecked = selected.has(product.id);
              return (
                <DashboardCard
                  key={product.id}
                  padding="sm"
                  className={cn(isChecked && "ring-2 ring-brand-200")}
                >
                  <div className="flex gap-3">
                    <label className="mt-1 flex shrink-0 cursor-pointer items-start">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(product.id)}
                        disabled={bulkPending}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                        aria-label={product.name}
                      />
                    </label>
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      {image ? (
                        <SafeImage
                          src={image.url}
                          alt={image.alt ?? product.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="font-semibold text-slate-900"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatMoney(product.price, product.currency, locale)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={product.status} />
                        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {categoryName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProductActions
                      storeId={storeId}
                      productId={product.id}
                      productName={product.name}
                      productStatus={product.status}
                      previewHref={
                        product.status === "published"
                          ? `/${storeSlug}/products/${product.slug}`
                          : undefined
                      }
                    />
                  </div>
                </DashboardCard>
              );
            })}
          </div>

          <DashboardCard padding="none" className="hidden md:block">
            <div className="overflow-x-auto">
              <table dir="rtl" className="w-full text-sm">
                <thead className="border-b border-slate-100 text-slate-400">
                  <tr>
                    <th className="w-10 py-3.5 pe-1 ps-4 text-start font-medium">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        ref={(node) => {
                          if (node) node.indeterminate = someFilteredSelected;
                        }}
                        onChange={toggleAllFiltered}
                        disabled={bulkPending || filteredIds.length === 0}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                        aria-label={t("selectAll")}
                      />
                    </th>
                    <th className="py-3.5 pe-3 ps-2 text-start font-medium">
                      {t("productCol")}
                    </th>
                    <th className="px-3 py-3.5 text-start font-medium">
                      {t("price")}
                    </th>
                    <th className="px-3 py-3.5 text-start font-medium">
                      {t("stock")}
                    </th>
                    <th className="px-3 py-3.5 text-start font-medium">
                      {t("status")}
                    </th>
                    <th className="px-3 py-3.5 text-start font-medium">
                      {t("category")}
                    </th>
                    <th className="py-3.5 pe-3 ps-4 text-start font-medium">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const image = product.images[0];
                    const categoryName = productCategoryName(
                      product,
                      categoriesById,
                      t("uncategorized"),
                    );
                    const isChecked = selected.has(product.id);
                    return (
                      <tr
                        key={product.id}
                        className={cn(
                          "border-b border-slate-50 last:border-0",
                          isChecked && "bg-brand-50/40",
                        )}
                      >
                        <td className="py-3.5 pe-1 ps-4 align-middle">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOne(product.id)}
                            disabled={bulkPending}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                            aria-label={product.name}
                          />
                        </td>
                        <td className="py-3.5 pe-3 ps-2">
                          <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              {image ? (
                                <SafeImage
                                  src={image.url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="44px"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/dashboard/products/${product.id}`}
                                className="font-medium text-slate-900 hover:underline"
                              >
                                {product.name}
                              </Link>
                              {product.featured ? (
                                <p className="text-xs text-brand-700">
                                  {t("featured")}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-slate-700">
                          {formatMoney(product.price, product.currency, locale)}
                        </td>
                        <td className="px-3 py-3.5 text-slate-500">
                          {product.stock == null ? "—" : product.stock}
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusBadge status={product.status} />
                        </td>
                        <td className="px-3 py-3.5 text-slate-600">
                          {categoryName}
                        </td>
                        <td className="py-3.5 pe-3 ps-4">
                          <ProductActions
                            storeId={storeId}
                            productId={product.id}
                            productName={product.name}
                            productStatus={product.status}
                            previewHref={
                              product.status === "published"
                                ? `/${storeSlug}/products/${product.slug}`
                                : undefined
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </>
      )}
    </div>
  );
}
