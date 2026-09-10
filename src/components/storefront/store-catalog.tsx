"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import type { Category, ProductWithMedia, Store } from "@/domain/types/entities";
import { ProductCard } from "@/components/storefront/product-card";
import { EmptyState } from "@/components/ui/feedback";
import { useI18n } from "@/i18n/provider";

type SortKey = "newest" | "price-asc" | "price-desc" | "name";

export function StoreCatalog({
  store,
  categories,
  products,
  featured,
  initialSearch,
  initialCategory,
}: {
  store: Store;
  categories: Category[];
  products: ProductWithMedia[];
  featured: ProductWithMedia[];
  initialSearch?: string;
  initialCategory?: string;
}) {
  const { t, locale } = useI18n();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch ?? "");
  const deferredSearch = useDeferredValue(search);
  const [categorySlug, setCategorySlug] = useState(initialCategory ?? "");
  const [sort, setSort] = useState<SortKey>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, Category>();
    for (const item of categories) map.set(item.slug, item);
    return map;
  }, [categories]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const product of products) {
      product.tags.forEach((tag) => set.add(tag));
    }
    return [...set].slice(0, 24);
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    const q = deferredSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description?.toLowerCase().includes(q) ?? false) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    if (categorySlug) {
      const category = categoryBySlug.get(categorySlug);
      if (category) {
        list = list.filter((item) => item.categoryId === category.id);
      }
    }
    if (inStockOnly) {
      list = list.filter((item) => item.stock == null || item.stock > 0);
    }
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    if (min != null && !Number.isNaN(min)) {
      list = list.filter((item) => item.price >= min);
    }
    if (max != null && !Number.isNaN(max)) {
      list = list.filter((item) => item.price <= max);
    }
    if (activeTags.length) {
      list = list.filter((item) =>
        activeTags.every((tag) => item.tags.includes(tag)),
      );
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
    }
    return list;
  }, [
    products,
    deferredSearch,
    categorySlug,
    categoryBySlug,
    inStockOnly,
    minPrice,
    maxPrice,
    activeTags,
    sort,
  ]);

  const showFeatured =
    !deferredSearch.trim() &&
    !categorySlug &&
    !activeTags.length &&
    featured.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-12 w-full border-0 pe-3 ps-10 text-sm outline-none ring-1 ring-[var(--store-border)] transition focus:ring-2 focus:ring-[var(--store-accent)]"
            style={{
              background: "var(--store-card)",
              color: "var(--store-text)",
              borderRadius: "var(--store-radius)",
              fontFamily: "var(--store-font-body)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="inline-flex h-12 items-center justify-center gap-2 px-4 text-sm font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--store-card)",
            color: "var(--store-text)",
            boxShadow: "inset 0 0 0 1px var(--store-border)",
            borderRadius: "var(--store-radius)",
          }}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("filters")}
          {filtersOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Filter className="h-4 w-4 opacity-50" />
          )}
        </button>
      </div>

      {categories.length > 0 ? (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          <Chip
            active={!categorySlug}
            label={t("allCategories")}
            onClick={() => setCategorySlug("")}
          />
          {categories.map((item) => (
            <Chip
              key={item.id}
              active={categorySlug === item.slug}
              label={item.name}
              onClick={() => setCategorySlug(item.slug)}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside
          className={`space-y-5 p-4 transition ${
            filtersOpen ? "block" : "hidden lg:block"
          }`}
          style={{
            background: "var(--store-surface)",
            boxShadow: "inset 0 0 0 1px var(--store-border)",
            borderRadius: "var(--store-radius)",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("filters")}</h2>
            <button
              type="button"
              className="text-xs font-medium opacity-70 hover:opacity-100 lg:hidden"
              onClick={() => setFiltersOpen(false)}
            >
              {t("close")}
            </button>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="opacity-70">{t("sortBy")}</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-10 w-full px-3 text-sm ring-1 ring-[var(--store-border)]"
              style={{
                background: "var(--store-card)",
                color: "var(--store-text)",
                borderRadius: "calc(var(--store-radius) * 0.55)",
              }}
            >
              <option value="newest">{t("sortNewest")}</option>
              <option value="price-asc">{t("sortPriceAsc")}</option>
              <option value="price-desc">{t("sortPriceDesc")}</option>
              <option value="name">{t("sortName")}</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm">
              <span className="opacity-70">{t("minPrice")}</span>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                className="h-10 w-full px-3 text-sm ring-1 ring-[var(--store-border)]"
                style={{
                  background: "var(--store-card)",
                  borderRadius: "calc(var(--store-radius) * 0.55)",
                }}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="opacity-70">{t("maxPrice")}</span>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                className="h-10 w-full px-3 text-sm ring-1 ring-[var(--store-border)]"
                style={{
                  background: "var(--store-card)",
                  borderRadius: "calc(var(--store-radius) * 0.55)",
                }}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
            />
            {t("inStockOnly")}
          </label>

          {tags.length > 0 ? (
            <div>
              <p className="mb-2 text-sm opacity-70">{t("tags")}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = activeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setActiveTags((list) =>
                          active
                            ? list.filter((item) => item !== tag)
                            : [...list, tag],
                        )
                      }
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={
                        active
                          ? {
                              background: "var(--store-accent)",
                              color: "var(--store-button-text)",
                            }
                          : {
                              background: "var(--store-card)",
                              boxShadow: "inset 0 0 0 1px var(--store-border)",
                            }
                      }
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className="w-full py-2 text-sm font-medium opacity-70 ring-1 ring-[var(--store-border)] hover:opacity-100"
            style={{ borderRadius: "calc(var(--store-radius) * 0.55)" }}
            onClick={() => {
              setActiveTags([]);
              setMinPrice("");
              setMaxPrice("");
              setInStockOnly(false);
              setSort("newest");
              setSearch("");
              setCategorySlug("");
            }}
          >
            {t("clearFilters")}
          </button>
        </aside>

        <div className="min-w-0 space-y-12">
          {showFeatured ? (
            <section>
              <h2
                className="mb-5 text-2xl tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--store-font-display)" }}
              >
                {t("featured")}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                {featured.slice(0, 6).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    href={`/${store.slug}/products/${product.slug}`}
                    accent={store.primaryColor}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-5">
              <h2
                className="text-2xl tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--store-font-display)" }}
              >
                {categorySlug
                  ? (categoryBySlug.get(categorySlug)?.name ?? t("allProducts"))
                  : deferredSearch.trim()
                    ? t("searchResults")
                    : t("allProducts")}
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--store-muted)" }}
              >
                {filtered.length} {t("productsCount").toLowerCase()}
              </p>
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                title={t("noProductsFound")}
                description={t("tryAnotherSearch")}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    href={`/${store.slug}/products/${product.slug}`}
                    accent={store.primaryColor}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-4 py-2 text-sm font-medium transition active:scale-[0.98]"
      style={
        active
          ? {
              backgroundColor: "var(--store-accent)",
              color: "var(--store-button-text)",
              borderRadius: "999px",
            }
          : {
              background: "var(--store-card)",
              color: "var(--store-text)",
              boxShadow: "inset 0 0 0 1px var(--store-border)",
              borderRadius: "999px",
            }
      }
    >
      {label}
    </button>
  );
}
