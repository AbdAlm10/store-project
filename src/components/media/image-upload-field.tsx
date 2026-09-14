"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
import { SafeImage } from "@/components/ui/safe-image";
import { uploadImageAction, deleteOwnedImageAction, type UploadImageKind } from "@/features/media/actions";
import { compressImageForUpload } from "@/lib/compress-image";
import { useI18n } from "@/i18n/provider";

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
    <div className="space-y-3">
      {name ? <input type="hidden" name={name} value={url} /> : null}

      {url ? (
        <div className="relative aspect-square max-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <SafeImage
            src={url}
            alt=""
            fill
            className="object-cover"
            sizes="192px"
          />
        </div>
      ) : null}

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
        <Label htmlFor={`${inputId}-url`}>{t("orPasteImageUrl")}</Label>
        <Input
          id={`${inputId}-url`}
          type="url"
          value={url}
          disabled={busy}
          placeholder="https://..."
          onChange={(event) => setUrl(event.target.value)}
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
