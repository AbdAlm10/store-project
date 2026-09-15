"use client";

import {
  CategoryIcon,
} from "@/components/categories/category-icon-picker";
import { SafeImage } from "@/components/ui/safe-image";
import { deleteOwnedImageAction, uploadImageAction } from "@/features/media/actions";
import { useI18n } from "@/i18n/provider";
import { compressImageForUpload } from "@/lib/compress-image";
import { searchLucideIcons } from "@/lib/icon-search";
import { cn } from "@/lib/utils/cn";
import { Link2, Loader2, Paperclip, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useId, useRef, useState } from "react";

type MediaMode = "icon" | "url" | "upload";

/**
 * Compact 3-action media picker for categories:
 * 1) search Lucide icon  2) paste image URL  3) upload from device
 */
export function CategoryMediaActions({
  storeId,
  imageUrl,
  icon,
  onImageUrlChange,
  onIconChange,
}: {
  storeId: string;
  imageUrl: string;
  icon: string | null;
  onImageUrlChange: (url: string) => void;
  onIconChange: (icon: string | null) => void;
}) {
  const { t } = useI18n();
  const fileInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<MediaMode>("icon");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const [icons, setIcons] = useState<string[]>(() =>
    searchLucideIcons("", 24).map((item) => item.id),
  );
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "compressing" | "uploading"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const busy = uploadStatus !== "idle";

  useEffect(() => {
    if (mode !== "icon") return;
    // Keep the default grid until the user actually types a search.
    if (!deferred) {
      setIcons(searchLucideIcons("", 24).map((item) => item.id));
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/icons/search?q=${encodeURIComponent(deferred)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as { icons?: string[] };
        const next = data.icons ?? [];
        setIcons(
          next.length
            ? next
            : searchLucideIcons(deferred, 24).map((item) => item.id),
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setIcons(searchLucideIcons(deferred, 24).map((item) => item.id));
      }
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferred, mode]);

  async function clearOwnedImage(previous: string) {
    if (previous) void deleteOwnedImageAction(storeId, previous);
  }

  function selectIcon(id: string) {
    const previous = imageUrl;
    onIconChange(id);
    onImageUrlChange("");
    if (previous) void clearOwnedImage(previous);
    setError(null);
  }

  function setUrl(next: string) {
    const previous = imageUrl;
    onImageUrlChange(next);
    if (next) onIconChange(null);
    if (previous && previous !== next) void clearOwnedImage(previous);
    setError(null);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploadStatus("compressing");
    setProgress(0);
    try {
      const compressed = await compressImageForUpload(file, "logo", (p) =>
        setProgress(Math.round(p)),
      );
      setUploadStatus("uploading");
      const formData = new FormData();
      formData.set("file", compressed);
      if (imageUrl) formData.set("previousUrl", imageUrl);
      const result = await uploadImageAction(storeId, "category", formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onImageUrlChange(result.url);
      onIconChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("imageUploadFailed"));
    } finally {
      setUploadStatus("idle");
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function clearVisual() {
    const previous = imageUrl;
    onImageUrlChange("");
    onIconChange(null);
    if (previous) void clearOwnedImage(previous);
  }

  const tabs: Array<{
    id: MediaMode;
    label: string;
    icon: typeof Search;
    ariaOnly?: boolean;
  }> = [
    { id: "icon", label: t("categoryIconSearchAction"), icon: Search },
    { id: "url", label: t("categoryPasteUrlAction"), icon: Link2 },
    {
      id: "upload",
      label: t("categoryUploadAction"),
      icon: Paperclip,
      ariaOnly: true,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80">
      <div className="flex items-stretch gap-1 border-b border-slate-100 p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              aria-label={tab.label}
              aria-pressed={active}
              disabled={busy}
              onClick={() => setMode(tab.id)}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-2.5 text-xs font-semibold transition sm:flex-none sm:px-3.5",
                active
                  ? "bg-white text-brand-800 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
                tab.ariaOnly && "sm:flex-none sm:px-3",
              )}
            >
              {busy && tab.id === "upload" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              )}
              {!tab.ariaOnly ? (
                <span className="hidden truncate sm:inline">{tab.label}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <input
        ref={fileRef}
        id={fileInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        disabled={busy}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <div className="space-y-3 p-3">
        {mode === "icon" ? (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("iconSearchPlaceholder")}
                className="h-10 w-full rounded-xl border-0 bg-white pe-9 ps-10 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500"
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
            <div className="grid max-h-40 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl bg-white p-2 ring-1 ring-slate-100 sm:grid-cols-8">
              {icons.map((id) => (
                <button
                  key={id}
                  type="button"
                  title={id}
                  onClick={() => selectIcon(id)}
                  className={cn(
                    "flex h-9 w-full items-center justify-center rounded-xl transition hover:bg-brand-50",
                    icon === id && "bg-brand-100 ring-2 ring-brand-500",
                  )}
                >
                  <CategoryIcon icon={id} className="h-[18px] w-[18px]" />
                </button>
              ))}
            </div>
          </>
        ) : null}

        {mode === "url" ? (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              {t("orPasteImageUrl")}
            </label>
            <input
              type="url"
              value={imageUrl}
              disabled={busy}
              placeholder="https://..."
              onChange={(event) => setUrl(event.target.value)}
              className="h-10 w-full rounded-xl border-0 bg-white px-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ) : null}

        {mode === "upload" ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" strokeWidth={1.75} />
              )}
              {uploadStatus === "compressing"
                ? `${t("compressingImage")} ${progress}%`
                : uploadStatus === "uploading"
                  ? t("uploadingImage")
                  : t("chooseImage")}
            </button>
            <p className="text-xs text-slate-500">{t("imageCompressHint")}</p>
          </div>
        ) : null}

        {imageUrl || icon ? (
          <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50">
              {imageUrl ? (
                <SafeImage
                  src={imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : icon ? (
                <CategoryIcon icon={icon} className="h-5 w-5" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-700">
                {imageUrl || icon}
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-red-600"
              onClick={clearVisual}
            >
              {t("clearImage")}
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
