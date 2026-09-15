"use client";

import type { ProductStatus } from "@/domain/types/enums";
import {
  deleteProductAction,
  duplicateProductAction,
  updateProductAction,
} from "@/features/products/actions";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Eye,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type BusyAction = "duplicate" | "delete" | "archive" | null;

export function ProductActions({
  storeId,
  productId,
  productName,
  productStatus,
  previewHref,
}: {
  storeId: string;
  productId: string;
  productName?: string;
  productStatus: ProductStatus;
  previewHref?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<BusyAction>(null);

  const disabled = pending;
  const isArchived = productStatus === "archived";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link
        href={`/dashboard/products/${productId}`}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-100",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        {t("edit")}
      </Link>

      {previewHref ? (
        <Link
          href={previewHref}
          target="_blank"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t("preview")}
        </Link>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        onClick={() => {
          setBusy("duplicate");
          startTransition(async () => {
            try {
              await duplicateProductAction(storeId, productId);
              router.refresh();
            } finally {
              setBusy(null);
            }
          });
        }}
      >
        {busy === "duplicate" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
        {busy === "duplicate" ? t("duplicating") : t("duplicate")}
      </button>

      <button
        type="button"
        disabled={disabled}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition disabled:opacity-50",
          isArchived
            ? "bg-brand-50 text-brand-800 hover:bg-brand-100"
            : "bg-amber-50 text-amber-800 hover:bg-amber-100",
        )}
        onClick={() => {
          setBusy("archive");
          startTransition(async () => {
            try {
              await updateProductAction(storeId, productId, {
                status: isArchived ? "published" : "archived",
              });
              router.refresh();
            } finally {
              setBusy(null);
            }
          });
        }}
      >
        {busy === "archive" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isArchived ? (
          <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.75} />
        ) : (
          <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
        {busy === "archive"
          ? isArchived
            ? t("unarchiving")
            : t("archiving")
          : isArchived
            ? t("unarchive")
            : t("archive")}
      </button>

      <button
        type="button"
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-50 px-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        onClick={() => {
          const message = productName
            ? t("deleteProductConfirm", { name: productName })
            : t("deleteThisProduct");
          if (!confirm(message)) return;
          setBusy("delete");
          startTransition(async () => {
            try {
              await deleteProductAction(storeId, productId);
              router.refresh();
            } finally {
              setBusy(null);
            }
          });
        }}
      >
        {busy === "delete" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
        {busy === "delete" ? t("deleting") : t("delete")}
      </button>
    </div>
  );
}
