"use client";

import { publishStoreAction } from "@/features/stores/update-actions";
import { useI18n } from "@/i18n/provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PublishChecklistAction({
  storeId,
  hasWhatsapp,
}: {
  storeId: string;
  hasWhatsapp: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasWhatsapp) {
    return (
      <Link
        href="/dashboard/store#whatsapp"
        className="shrink-0 text-xs font-semibold text-brand-700 underline"
      >
        {t("whatsappRequiredToPublish")}
      </Link>
    );
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void publishStoreAction(storeId).then((result) => {
            if (!result.ok) {
              setError(result.error);
              setPending(false);
              return;
            }
            router.refresh();
            setPending(false);
          });
        }}
        className="rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:opacity-70"
      >
        {pending ? t("saving") : t("publishThisStore")}
      </button>
      {error ? (
        <span className="max-w-40 text-end text-[11px] text-red-600">{error}</span>
      ) : null}
    </span>
  );
}
