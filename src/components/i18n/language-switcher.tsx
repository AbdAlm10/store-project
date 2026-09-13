"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  LOCALE_LABELS,
  LOCALES,
  type Locale,
} from "@/i18n/config";
import { setLocaleAction } from "@/i18n/actions";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher({
  locale,
  className,
  compact = false,
}: {
  locale: Locale;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className={cn("inline-flex items-center gap-2", className)}>
      {compact ? null : (
        <span className="sr-only">Language</span>
      )}
      <select
        className={cn(
          "h-9 rounded-xl border border-slate-300 bg-white px-2 text-sm font-medium text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
          compact && "border-white/20 bg-white/10 text-white",
        )}
        value={locale}
        disabled={pending}
        aria-label="Language"
        onChange={(event) => {
          const next = event.target.value as Locale;
          startTransition(async () => {
            await setLocaleAction(next);
            router.refresh();
          });
        }}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} className="text-slate-900">
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
