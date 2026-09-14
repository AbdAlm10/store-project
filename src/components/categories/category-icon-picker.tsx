"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import {
  getLucideIconEntry,
  iconSvgSrc,
  searchLucideIcons,
} from "@/lib/icon-search";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/i18n/provider";

export function CategoryIconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const [icons, setIcons] = useState<string[]>(() =>
    searchLucideIcons("", 24).map((item) => item.id),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/icons/search?q=${encodeURIComponent(deferred)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          icons?: string[];
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? t("iconSearchFailed"));
          setIcons(searchLucideIcons(deferred, 24).map((item) => item.id));
          return;
        }
        const next = data.icons ?? [];
        setIcons(
          next.length
            ? next
            : searchLucideIcons(deferred, 24).map((item) => item.id),
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setIcons(searchLucideIcons(deferred, 24).map((item) => item.id));
        setError(null);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferred, t]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">{t("categoryIcon")}</p>
        {value ? (
          <button
            type="button"
            className="text-xs font-semibold text-red-600"
            onClick={() => onChange(null)}
          >
            {t("clearIcon")}
          </button>
        ) : null}
      </div>

      {value ? (
        <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
          <CategoryIcon icon={value} className="h-7 w-7" />
          <code className="truncate text-xs text-slate-600">{value}</code>
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("iconSearchPlaceholder")}
          className="h-11 w-full rounded-2xl border-0 bg-white pe-9 ps-10 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500"
        />
        {query ? (
          <button
            type="button"
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700"
            onClick={() => setQuery("")}
            aria-label={t("clearFilters")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">{t("searchingIcons")}</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {icons.length > 0 ? (
        <div className="grid max-h-52 grid-cols-6 gap-1.5 overflow-y-auto rounded-2xl bg-white p-2 ring-1 ring-slate-200 sm:grid-cols-8">
          {icons.map((id) => (
            <button
              key={id}
              type="button"
              title={id}
              onClick={() => onChange(id)}
              className={cn(
                "flex h-9 w-full items-center justify-center rounded-xl transition hover:bg-brand-50",
                value === id && "bg-brand-100 ring-2 ring-brand-500",
              )}
            >
              <CategoryIcon icon={id} className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
      ) : deferred && !loading ? (
        <p className="text-xs text-slate-500">{t("noIconsFound")}</p>
      ) : null}
    </div>
  );
}

export function CategoryIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
  color?: string;
}) {
  const lucide = getLucideIconEntry(icon);
  if (lucide) {
    const Icon = lucide.Icon;
    return <Icon className={cn("h-5 w-5", className)} aria-hidden />;
  }

  const src = iconSvgSrc(icon);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn("h-5 w-5", className)}
      loading="lazy"
      decoding="async"
    />
  );
}
