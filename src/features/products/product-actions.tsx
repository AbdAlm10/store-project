"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  deleteProductAction,
  duplicateProductAction,
} from "@/features/products/actions";
import { useI18n } from "@/i18n/provider";

export function ProductActions({
  storeId,
  productId,
  productName,
  previewHref,
}: {
  storeId: string;
  productId: string;
  productName?: string;
  previewHref?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold">
      <Link
        href={`/dashboard/products/${productId}`}
        className="text-teal-700 hover:underline"
      >
        {t("edit")}
      </Link>
      {previewHref ? (
        <Link
          href={previewHref}
          target="_blank"
          className="text-slate-600 hover:underline"
        >
          {t("preview")}
        </Link>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className="text-slate-600 hover:underline"
        onClick={() =>
          startTransition(async () => {
            await duplicateProductAction(storeId, productId);
            router.refresh();
          })
        }
      >
        {t("duplicate")}
      </button>
      <button
        type="button"
        disabled={pending}
        className="text-red-600 hover:underline"
        onClick={() =>
          startTransition(async () => {
            const message = productName
              ? t("deleteProductConfirm", { name: productName })
              : t("deleteThisProduct");
            if (!confirm(message)) return;
            await deleteProductAction(storeId, productId);
            router.refresh();
          })
        }
      >
        {t("delete")}
      </button>
    </div>
  );
}
