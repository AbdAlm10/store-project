"use client";

import { PageHeader, StatusBadge } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/forms";
import { SafeImage } from "@/components/ui/safe-image";
import type { Category, ProductWithMedia } from "@/domain/types/entities";
import type { ProductStatus } from "@/domain/types/enums";
import { ProductActions } from "@/features/products/product-actions";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { formatMoney } from "@/lib/social/sharing";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, useTransition } from "react";

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

  const hasFilters = Boolean(search || status || categoryId);

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
            <option value="archived">{t("archived")}</option>
          </Select>
        </div>
      </DashboardCard>

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
              return (
                <DashboardCard key={product.id} padding="sm">
                  <div className="flex gap-3">
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
                    <th className="py-3.5 pe-3 ps-4 text-start font-medium">
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
                    return (
                      <tr
                        key={product.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="py-3.5 pe-3 ps-4">
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
