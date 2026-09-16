"use client";

import { CategoryIcon } from "@/components/categories/category-icon-picker";
import { FavoritesMenu } from "@/components/storefront/favorites-menu";
import { ProductCard } from "@/components/storefront/product-card";
import { StoreOpenStatus } from "@/components/storefront/store-open-status";
import { SafeImage } from "@/components/ui/safe-image";
import type { Category, ProductWithMedia, Store } from "@/domain/types/entities";
import { useI18n } from "@/i18n/provider";
import {
  isColorOptionName,
  isSizeOptionName,
  resolveValueHex,
} from "@/lib/option-colors";
import { cn } from "@/lib/utils/cn";
import {
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  Search,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

type SortKey = "newest" | "price-asc" | "price-desc" | "name";

export function StoreCatalog({
  store,
  categories,
  products,
  featured: _featured,
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
  void _featured;
  const { t, locale } = useI18n();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState(initialSearch ?? "");
  const deferredSearch = useDeferredValue(search);
  const [categorySlug, setCategorySlug] = useState(initialCategory ?? "");
  const [sort, setSort] = useState<SortKey>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [priceReady, setPriceReady] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeSizes, setActiveSizes] = useState<string[]>([]);
  const [activeColors, setActiveColors] = useState<string[]>([]);

  const categoryBySlug = useMemo(() => {
    const map = new Map<string, Category>();
    for (const item of categories) map.set(item.slug, item);
    return map;
  }, [categories]);

  const genreMeta = useMemo(() => {
    const thumbByCategory = new Map<string, string>();
    const countByCategory = new Map<string, number>();
    for (const product of products) {
      if (!product.categoryId) continue;
      countByCategory.set(
        product.categoryId,
        (countByCategory.get(product.categoryId) ?? 0) + 1,
      );
      if (!thumbByCategory.has(product.categoryId) && product.images[0]?.url) {
        thumbByCategory.set(product.categoryId, product.images[0].url);
      }
    }
    return { thumbByCategory, countByCategory };
  }, [products]);

  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 100 };
    let min = products[0].price;
    let max = products[0].price;
    for (const product of products) {
      if (product.price < min) min = product.price;
      if (product.price > max) max = product.price;
    }
    if (min === max) max = min + 1;
    return { min: Math.floor(min), max: Math.ceil(max) };
  }, [products]);

  useEffect(() => {
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
    setPriceReady(true);
  }, [priceBounds.min, priceBounds.max]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setFiltersOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const schemaSource = useMemo(() => {
    if (categorySlug) {
      const cat = categoryBySlug.get(categorySlug);
      return cat ? [cat] : categories;
    }
    return categories;
  }, [categories, categorySlug, categoryBySlug]);

  const sizeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of schemaSource) {
      for (const opt of cat.optionSchema) {
        if (!isSizeOptionName(opt.name)) continue;
        for (const value of opt.values) {
          if (value.label) map.set(value.label.toLowerCase(), value.label);
        }
      }
    }
    return [...map.values()];
  }, [schemaSource]);

  const colorOptions = useMemo(() => {
    const map = new Map<string, { label: string; hex: string }>();
    for (const cat of schemaSource) {
      for (const opt of cat.optionSchema) {
        if (!(opt.kind === "color" || isColorOptionName(opt.name))) continue;
        for (const value of opt.values) {
          if (!value.label) continue;
          const key = value.label.toLowerCase();
          if (map.has(key)) continue;
          map.set(key, {
            label: value.label,
            hex: resolveValueHex(value) ?? "#94A3B8",
          });
        }
      }
    }
    return [...map.values()];
  }, [schemaSource]);

  const propertyGroups = useMemo(() => {
    const groups: Array<{ name: string; values: string[] }> = [];
    const seenNames = new Set<string>();
    for (const cat of schemaSource) {
      for (const opt of cat.optionSchema) {
        if (isSizeOptionName(opt.name)) continue;
        if (opt.kind === "color" || isColorOptionName(opt.name)) continue;
        const key = opt.name.trim().toLowerCase();
        if (!key || seenNames.has(key)) continue;
        const values = [
          ...new Map(
            opt.values
              .filter((value) => value.label.trim())
              .map((value) => [value.label.toLowerCase(), value.label]),
          ).values(),
        ];
        if (!values.length) continue;
        seenNames.add(key);
        groups.push({ name: opt.name, values });
      }
    }
    return groups;
  }, [schemaSource]);

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
    if (priceReady) {
      list = list.filter(
        (item) => item.price >= minPrice && item.price <= maxPrice,
      );
    }
    if (activeTags.length) {
      list = list.filter((item) => matchesAnyOptionValue(item, activeTags));
    }
    if (activeSizes.length) {
      list = list.filter((item) =>
        matchesOptionLabels(item, activeSizes, isSizeOptionName),
      );
    }
    if (activeColors.length) {
      list = list.filter((item) =>
        matchesOptionLabels(item, activeColors, (name) =>
          isColorOptionName(name),
        ),
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
    priceReady,
    minPrice,
    maxPrice,
    activeTags,
    activeSizes,
    activeColors,
    sort,
  ]);

  const activeFilterCount =
    activeTags.length +
    activeSizes.length +
    activeColors.length +
    (inStockOnly ? 1 : 0) +
    (priceReady &&
    (minPrice > priceBounds.min || maxPrice < priceBounds.max)
      ? 1
      : 0);

  useEffect(() => {
    setActiveSizes([]);
    setActiveColors([]);
    setActiveTags([]);
  }, [categorySlug]);

  useEffect(() => {
    if (!filtersOpen) return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  function clearFilters() {
    setActiveTags([]);
    setActiveSizes([]);
    setActiveColors([]);
    setInStockOnly(false);
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
    setSort("newest");
  }

  const title = categorySlug
    ? (categoryBySlug.get(categorySlug)?.name ?? t("allProducts"))
    : deferredSearch.trim()
      ? t("searchResults")
      : t("allProducts");

  const filterPanel = (
    <FilterPanel
      onClose={() => setFiltersOpen(false)}
      sort={sort}
      setSort={setSort}
      sizeOptions={sizeOptions}
      colorOptions={colorOptions}
      propertyGroups={propertyGroups}
      activeSizes={activeSizes}
      activeColors={activeColors}
      activeTags={activeTags}
      setActiveSizes={setActiveSizes}
      setActiveColors={setActiveColors}
      setActiveTags={setActiveTags}
      minPrice={minPrice}
      maxPrice={maxPrice}
      setMinPrice={setMinPrice}
      setMaxPrice={setMaxPrice}
      priceBounds={priceBounds}
      resultCount={filtered.length}
      onClear={clearFilters}
      onApply={() => {
        if (!window.matchMedia("(min-width: 1024px)").matches) {
          setFiltersOpen(false);
        }
      }}
    />
  );

  return (
    <div className="relative w-full">
      <div className="relative mx-auto w-full max-w-[100rem] px-3 pb-10 pt-2 sm:px-4 lg:px-5 xl:px-6 lg:pt-2.5">
        {/* Filters start at the top (beside search) to use the full vertical strip */}
        <div className="flex items-start gap-3 lg:gap-4" dir="ltr">
          <div className="min-w-0 flex-1" dir="rtl">
            {/* Search (start/right) + open status (end/left), then genres */}
            <div className="mb-2.5 flex flex-col items-stretch gap-3">
              <div className="flex w-full items-center justify-between gap-3">
                <form
                  className="min-w-0 flex-1 max-w-md"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <div
                    className="mt-1 flex items-center gap-1 p-0.5"
                    style={{
                      background:
                        "color-mix(in srgb, var(--store-surface) 88%, transparent)",
                      borderRadius: "999px",
                      boxShadow:
                        "inset 0 0 0 1px color-mix(in srgb, var(--store-border) 55%, transparent)",
                    }}
                  >
                    <div className="relative min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-40"
                        aria-hidden
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("searchPlaceholder")}
                        aria-label={t("searchProductsAria")}
                        className="h-8 w-full border-0 bg-transparent pe-3 ps-9 text-sm outline-none sm:h-9"
                        style={{ color: "var(--store-text)" }}
                      />
                    </div>
                  </div>
                </form>

                <div className="flex shrink-0 items-center gap-2" dir="ltr">
                  <FavoritesMenu storeSlug={store.slug} products={products} />
                  <StoreOpenStatus openingHours={store.openingHours} />
                </div>
              </div>

              {categories.length > 0 ? (
                <section aria-label={t("categories")}>
                  <div className="ys-scrollbar-none flex gap-2 overflow-x-auto pb-0.5 sm:overflow-visible sm:flex-wrap">
                    <GenreBubble
                      label={t("allCategories")}
                      active={!categorySlug}
                      count={products.length}
                      onClick={() => setCategorySlug("")}
                    />
                    {categories.map((item) => (
                      <GenreBubble
                        key={item.id}
                        label={item.name}
                        active={categorySlug === item.slug}
                        count={genreMeta.countByCategory.get(item.id) ?? 0}
                        imageUrl={
                          item.imageUrl ??
                          (item.icon
                            ? undefined
                            : genreMeta.thumbByCategory.get(item.id))
                        }
                        icon={item.icon}
                        onClick={() => setCategorySlug(item.slug)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="mb-2.5 flex items-end gap-3">
              {/* First in RTL flex ⇒ physical right (same side as desktop filters) */}
              {!filtersOpen ? (
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="relative order-first inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition duration-200 hover:scale-105 active:scale-95 lg:hidden"
                  style={{
                    background: activeFilterCount
                      ? "var(--store-accent)"
                      : "var(--store-surface)",
                    color: activeFilterCount
                      ? "var(--store-button-text)"
                      : "var(--store-text)",
                    boxShadow: activeFilterCount
                      ? "0 8px 22px -12px color-mix(in srgb, var(--store-accent) 70%, transparent)"
                      : "inset 0 0 0 1px var(--store-border)",
                  }}
                  aria-label={t("filters")}
                >
                  <PanelRightOpen className="h-4 w-4" />
                  {activeFilterCount > 0 ? (
                    <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-(--store-accent)">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              ) : null}

              <div className="min-w-0 flex-1">
                <h1
                  className="text-xl font-bold tracking-tight sm:text-2xl"
                  style={{ fontFamily: "var(--store-font-display)" }}
                >
                  {title}
                </h1>
                <p
                  className="mt-0.5 text-xs sm:text-sm"
                  style={{ color: "var(--store-muted)" }}
                >
                  {filtered.length} {t("productsCount").toLowerCase()}
                </p>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-6 text-center sm:py-8">
                <p
                  className="text-base font-semibold tracking-tight"
                  style={{ fontFamily: "var(--store-font-display)" }}
                >
                  {t("noProductsFound")}
                </p>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--store-muted)" }}
                >
                  {t("tryAnotherSearch")}
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  "grid grid-cols-2 gap-2 transition-[gap] duration-300 sm:gap-2.5",
                  filtersOpen
                    ? "sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                    : "sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
                )}
              >
                {filtered.map((product, index) => (
                  <div
                    key={product.id}
                    className="animate-ys-rise"
                    style={{
                      animationDelay: `${Math.min(index, 12) * 30}ms`,
                    }}
                  >
                    <ProductCard
                      product={product}
                      href={`/${store.slug}/products/${product.slug}`}
                      storeSlug={store.slug}
                      accent={store.primaryColor}
                      locale={locale}
                      priority={index < 6}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden shrink-0 lg:block">
            <div
              className={cn(
                "overflow-hidden transition-[width,opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                filtersOpen
                  ? "w-[14.75rem] translate-x-0 opacity-100 xl:w-[15.5rem]"
                  : "w-9 translate-x-0 opacity-100",
              )}
            >
              {filtersOpen ? (
                <div
                  className="w-[14.75rem] xl:w-[15.5rem]"
                  dir="rtl"
                >
                  {filterPanel}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: activeFilterCount
                      ? "var(--store-accent)"
                      : "var(--store-surface)",
                    color: activeFilterCount
                      ? "var(--store-button-text)"
                      : "var(--store-text)",
                    boxShadow: activeFilterCount
                      ? "0 8px 22px -12px color-mix(in srgb, var(--store-accent) 70%, transparent)"
                      : "inset 0 0 0 1px var(--store-border)",
                  }}
                  aria-label={t("filters")}
                  aria-expanded={false}
                >
                  <PanelRightOpen className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer: physical right edge (dir=ltr so slide is never flipped) */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          filtersOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!filtersOpen}
        dir="ltr"
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/35 transition-opacity duration-300 ease-out",
            filtersOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setFiltersOpen(false)}
          aria-label={t("close")}
        />
        <div
          className={cn(
            "absolute inset-y-0 right-0 w-[min(100%,20rem)] overflow-y-auto p-3 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            filtersOpen
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0",
          )}
          style={{ background: "var(--store-bg)" }}
          dir="rtl"
        >
          {filterPanel}
        </div>
      </div>
    </div>
  );
}

function matchesOptionLabels(
  product: ProductWithMedia,
  labels: string[],
  nameMatch: (name: string) => boolean,
) {
  const wanted = new Set(labels.map((item) => item.toLowerCase()));
  for (const variant of product.variants) {
    for (const [key, value] of Object.entries(variant.options)) {
      if (!nameMatch(key)) continue;
      if (wanted.has(value.toLowerCase())) return true;
    }
  }
  return false;
}

function matchesAnyOptionValue(product: ProductWithMedia, labels: string[]) {
  const wanted = new Set(labels.map((item) => item.toLowerCase()));
  for (const variant of product.variants) {
    for (const value of Object.values(variant.options)) {
      if (wanted.has(value.toLowerCase())) return true;
    }
  }
  return false;
}

function FilterPanel({
  onClose,
  sort,
  setSort,
  sizeOptions,
  colorOptions,
  propertyGroups,
  activeSizes,
  activeColors,
  activeTags,
  setActiveSizes,
  setActiveColors,
  setActiveTags,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  priceBounds,
  resultCount,
  onClear,
  onApply,
}: {
  onClose: () => void;
  sort: SortKey;
  setSort: (value: SortKey) => void;
  sizeOptions: string[];
  colorOptions: Array<{ label: string; hex: string }>;
  propertyGroups: Array<{ name: string; values: string[] }>;
  activeSizes: string[];
  activeColors: string[];
  activeTags: string[];
  setActiveSizes: (value: string[] | ((prev: string[]) => string[])) => void;
  setActiveColors: (value: string[] | ((prev: string[]) => string[])) => void;
  setActiveTags: (value: string[] | ((prev: string[]) => string[])) => void;
  minPrice: number;
  maxPrice: number;
  setMinPrice: (value: number) => void;
  setMaxPrice: (value: number) => void;
  priceBounds: { min: number; max: number };
  resultCount: number;
  onClear: () => void;
  onApply: () => void;
}) {
  const { t } = useI18n();
  const [sortOpen, setSortOpen] = useState(false);
  const range = Math.max(priceBounds.max - priceBounds.min, 1);
  const leftPct = ((minPrice - priceBounds.min) / range) * 100;
  const rightPct = ((maxPrice - priceBounds.min) / range) * 100;
  const hasFacets =
    sizeOptions.length > 0 ||
    colorOptions.length > 0 ||
    propertyGroups.length > 0;

  const sortOptions: Array<{ value: SortKey; label: string }> = [
    { value: "newest", label: t("sortNewest") },
    { value: "price-asc", label: t("sortPriceAsc") },
    { value: "price-desc", label: t("sortPriceDesc") },
    { value: "name", label: t("sortName") },
  ];
  const activeSortLabel =
    sortOptions.find((option) => option.value === sort)?.label ??
    sortOptions[0]?.label;

  function toggle(
    list: string[],
    setter: (value: string[] | ((prev: string[]) => string[])) => void,
    value: string,
  ) {
    setter(
      list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value],
    );
  }

  return (
    <aside
      className="lg:sticky lg:top-[calc(var(--store-logo-size)+0.65rem)]"
      style={{ color: "var(--store-text)" }}
    >
      <div className="ys-scrollbar-none flex max-h-[calc(100vh-var(--store-logo-size)-1.5rem)] w-full flex-col overflow-hidden py-1">
        <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
          <h2
            className="text-[15px] font-bold tracking-tight"
            style={{ fontFamily: "var(--store-font-display)" }}
          >
            {t("filters")}
          </h2>
          {/* Inside the box, on the left in RTL (end of row) */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "var(--store-surface)",
              color: "var(--store-text)",
              boxShadow: "inset 0 0 0 1px var(--store-border)",
            }}
            aria-label={t("close")}
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <div className="ys-scrollbar-none min-h-0 overflow-y-auto pe-0.5">
          <section className="py-2.5">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
              <span className="font-semibold" style={{ color: "var(--store-text)" }}>
                {t("sortBy")} :
              </span>
              <button
                type="button"
                onClick={() => setSortOpen((open) => !open)}
                aria-expanded={sortOpen}
                className="inline-flex max-w-full items-center gap-0.5 font-semibold transition hover:opacity-80 active:scale-[0.98]"
                style={{ color: "var(--store-accent)" }}
              >
                <span className="truncate">{activeSortLabel}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    sortOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            </div>
            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                sortOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="mt-1.5 flex flex-col gap-1">
                  {sortOptions.map((option) => {
                    const active = sort === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSort(option.value);
                          setSortOpen(false);
                        }}
                        className="rounded-lg px-2.5 py-2 text-start text-xs font-semibold transition active:scale-[0.99]"
                        style={
                          active
                            ? {
                                background: "var(--store-accent)",
                                color: "var(--store-button-text)",
                              }
                            : {
                                background:
                                  "color-mix(in srgb, var(--store-border) 40%, transparent)",
                                color: "var(--store-text)",
                              }
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {!hasFacets ? (
            <p
              className="py-3 text-sm leading-relaxed"
              style={{ color: "var(--store-muted)" }}
            >
              {t("emptyMatchingHint")}
            </p>
          ) : null}

          {sizeOptions.length > 0 ? (
            <FilterSection title={t("filterSize")}>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((size) => {
                  const active = activeSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggle(activeSizes, setActiveSizes, size)}
                      className="rounded-full px-2.5 py-1.5 text-xs font-semibold transition active:scale-[0.98]"
                      style={
                        active
                          ? {
                              background: "var(--store-text)",
                              color: "var(--store-surface)",
                            }
                          : {
                              background:
                                "color-mix(in srgb, var(--store-border) 45%, white)",
                              color: "var(--store-text)",
                            }
                      }
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </FilterSection>
          ) : null}

          {colorOptions.length > 0 ? (
            <FilterSection title={t("filterColour")}>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => {
                  const active = activeColors.includes(color.label);
                  return (
                    <button
                      key={color.label}
                      type="button"
                      onClick={() =>
                        toggle(activeColors, setActiveColors, color.label)
                      }
                      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition active:scale-[0.98]"
                      style={
                        active
                          ? {
                              background: "var(--store-text)",
                              color: "var(--store-surface)",
                            }
                          : {
                              background:
                                "color-mix(in srgb, var(--store-border) 45%, white)",
                              color: "var(--store-text)",
                            }
                      }
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                        style={{ background: color.hex }}
                      />
                      {color.label}
                    </button>
                  );
                })}
              </div>
            </FilterSection>
          ) : null}

          {propertyGroups.map((group) => (
            <FilterSection key={group.name} title={group.name}>
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const active = activeTags.includes(value);
                  return (
                    <button
                      key={`${group.name}-${value}`}
                      type="button"
                      onClick={() => toggle(activeTags, setActiveTags, value)}
                      className="rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98]"
                      style={
                        active
                          ? {
                              background: "var(--store-text)",
                              color: "var(--store-surface)",
                            }
                          : {
                              background:
                                "color-mix(in srgb, var(--store-border) 45%, white)",
                              color: "var(--store-text)",
                            }
                      }
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </FilterSection>
          ))}
        </div>

        <div className="mt-1 shrink-0 space-y-2.5 pt-2.5">
          <div>
            <h3 className="mb-2 text-xs font-semibold">{t("filterPrice")}</h3>
            <div className="relative h-7">
              <div
                className="absolute inset-s-0 inset-e-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full"
                style={{
                  background:
                    "color-mix(in srgb, var(--store-border) 80%, #bbb)",
                }}
              />
              <div
                className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full"
                style={{
                  left: `${leftPct}%`,
                  width: `${Math.max(rightPct - leftPct, 0)}%`,
                  background: "var(--store-text)",
                }}
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                value={minPrice}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setMinPrice(Math.min(next, maxPrice));
                }}
                className="store-range absolute inset-x-0 top-0 z-20 h-7 w-full appearance-none bg-transparent"
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                value={maxPrice}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setMaxPrice(Math.max(next, minPrice));
                }}
                className="store-range absolute inset-x-0 top-0 z-30 h-7 w-full appearance-none bg-transparent"
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={priceBounds.min}
                max={maxPrice}
                value={minPrice}
                aria-label={t("filterPrice")}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === "") return;
                  const next = Number(raw);
                  if (!Number.isFinite(next)) return;
                  const clamped = Math.min(
                    Math.max(next, priceBounds.min),
                    maxPrice,
                  );
                  setMinPrice(clamped);
                }}
                className="h-8 w-[4.5rem] rounded-lg border-0 px-2 text-center text-xs font-semibold tabular-nums outline-none"
                style={{
                  background:
                    "color-mix(in srgb, var(--store-border) 35%, transparent)",
                  color: "var(--store-text)",
                  boxShadow:
                    "inset 0 0 0 1px color-mix(in srgb, var(--store-border) 70%, transparent)",
                }}
              />
              <input
                type="number"
                inputMode="numeric"
                min={minPrice}
                max={priceBounds.max}
                value={maxPrice}
                aria-label={t("filterPrice")}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === "") return;
                  const next = Number(raw);
                  if (!Number.isFinite(next)) return;
                  const clamped = Math.max(
                    Math.min(next, priceBounds.max),
                    minPrice,
                  );
                  setMaxPrice(clamped);
                }}
                className="h-8 w-[4.5rem] rounded-lg border-0 px-2 text-center text-xs font-semibold tabular-nums outline-none"
                style={{
                  background:
                    "color-mix(in srgb, var(--store-border) 35%, transparent)",
                  color: "var(--store-text)",
                  boxShadow:
                    "inset 0 0 0 1px color-mix(in srgb, var(--store-border) 70%, transparent)",
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onClear}
            className="w-full py-0.5 text-center text-xs font-semibold opacity-55 transition hover:opacity-100"
          >
            {t("clearFilters")}
          </button>
        </div>
      </div>
    </aside>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-2.5">
      <h3
        className="mb-2 text-xs font-semibold"
        style={{ color: "var(--store-text)" }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function GenreBubble({
  label,
  active,
  count,
  imageUrl,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  imageUrl?: string;
  icon?: string | null;
  onClick: () => void;
}) {
  const initial = label.trim().slice(0, 1).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-10 mt-1 shrink-0 flex-col items-center gap-0.5 outline-none transition active:scale-[0.96] sm:w-11"
    >
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full transition duration-300 sm:h-9 sm:w-9",
          active
            ? "scale-105 shadow-md ring-2 ring-(--store-accent)"
            : "hover:scale-105",
        )}
        style={{
          background: imageUrl
            ? "var(--store-surface)"
            : "color-mix(in srgb, var(--store-accent) 14%, white)",
          boxShadow: active
            ? undefined
            : "inset 0 0 0 1px color-mix(in srgb, var(--store-border) 75%, transparent)",
        }}
      >
        {imageUrl ? (
          <SafeImage
            src={imageUrl}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-110"
            sizes="36px"
          />
        ) : icon ? (
          <CategoryIcon icon={icon} className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <span className="text-[10px] font-bold sm:text-xs">{initial}</span>
        )}
      </span>
      <span className="w-full mt-1 text-center">
        <span
          className={cn(
            "block truncate text-[10px] font-semibold sm:text-[11px]",
            active && "text-(--store-accent)",
          )}
        >
          {label}
        </span>
      </span>
    </button>
  );
}
