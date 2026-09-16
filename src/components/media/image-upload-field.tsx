"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
import { SafeImage } from "@/components/ui/safe-image";
import { deleteOwnedImageAction, uploadImageAction, type UploadImageKind } from "@/features/media/actions";
import { useI18n } from "@/i18n/provider";
import { compressImageForUpload } from "@/lib/compress-image";
import { cn } from "@/lib/utils/cn";
import { useId, useRef, useState } from "react";

type ImageUploadFieldProps = {
  storeId: string;
  kind: UploadImageKind;
  /** Hidden form field name when used inside a native form */
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (url: string) => void;
  /** Hide the compression hint (useful in multi-slot UIs). URL paste stays visible. */
  compact?: boolean;
};

export function ImageUploadField({
  storeId,
  kind,
  name,
  value,
  defaultValue = "",
  onChange,
  compact = false,
}: ImageUploadFieldProps) {
  const { t } = useI18n();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [internalUrl, setInternalUrl] = useState(defaultValue);
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const url = value !== undefined ? value : internalUrl;
  const busy = status !== "idle";
  const replacesOwnedAsset =
    kind === "logo" || kind === "cover" || kind === "category";

  function setUrl(next: string) {
    if (value === undefined) setInternalUrl(next);
    onChange?.(next);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setStatus("compressing");
    setProgress(0);

    try {
      const purpose = kind === "product" ? "product" : "logo";
      const compressed = await compressImageForUpload(file, purpose, (p) =>
        setProgress(Math.round(p)),
      );

      setStatus("uploading");
      const formData = new FormData();
      formData.set("file", compressed);
      if (replacesOwnedAsset && url) {
        formData.set("previousUrl", url);
      }

      const result = await uploadImageAction(storeId, kind, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("imageUploadFailed"));
    } finally {
      setStatus("idle");
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleClear() {
    const previous = url;
    setUrl("");
    if (replacesOwnedAsset && previous) {
      void deleteOwnedImageAction(storeId, previous);
    }
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {name ? <input type="hidden" name={name} value={url} /> : null}

      <div
        className={cn(
          "flex gap-3",
          compact ? "items-center" : "flex-col",
        )}
      >
        {url ? (
          <div
            className={cn(
              "relative shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100",
              compact
                ? "h-14 w-14"
                : "aspect-square max-w-[12rem] w-full",
            )}
          >
            <SafeImage
              src={url}
              alt=""
              fill
              className={compact ? "object-contain p-1" : "object-cover"}
              sizes={compact ? "56px" : "192px"}
            />
          </div>
        ) : compact ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-400">
            {t("logoUrl")}
          </div>
        ) : null}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              disabled={busy}
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {status === "compressing"
                ? `${t("compressingImage")} ${progress}%`
                : status === "uploading"
                  ? t("uploadingImage")
                  : t("chooseImage")}
            </Button>
            {url ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void handleClear()}
              >
                {t("clearImage")}
              </Button>
            ) : null}
          </div>

          {!compact ? (
            <p className="text-xs text-slate-500">{t("imageCompressHint")}</p>
          ) : null}

          <div>
            {!compact ? (
              <Label htmlFor={`${inputId}-url`}>{t("orPasteImageUrl")}</Label>
            ) : null}
            <Input
              id={`${inputId}-url`}
              type="url"
              value={url}
              disabled={busy}
              placeholder={compact ? t("orPasteImageUrl") : "https://..."}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
