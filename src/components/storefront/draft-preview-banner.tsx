"use client";

import { publishStoreAction } from "@/features/stores/update-actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DraftPreviewBanner({
  storeId,
  hasWhatsapp,
  message,
  publishLabel,
  whatsappLabel,
}: {
  storeId: string;
  hasWhatsapp: boolean;
  message: string;
  publishLabel: string;
  whatsappLabel: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      {message}{" "}
      {hasWhatsapp ? (
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
          className="underline disabled:opacity-70"
        >
          {pending ? "…" : publishLabel}
        </button>
      ) : (
        <Link
          href="/dashboard/store#whatsapp"
          className="underline"
          prefetch={false}
        >
          {whatsappLabel}
        </Link>
      )}
      {error ? <span className="mt-1 block">{error}</span> : null}
    </div>
  );
}
