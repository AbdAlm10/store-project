"use client";

import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";

const STATUS_KEY: Record<string, MessageKey> = {
  published: "published",
  draft: "draft",
  hidden: "hidden",
  archived: "archived",
  suspended: "suspended",
  restricted: "restricted",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const styles: Record<string, string> = {
    published: "bg-teal-50 text-teal-800 ring-teal-200",
    draft: "bg-slate-100 text-slate-700 ring-slate-200",
    hidden: "bg-amber-50 text-amber-800 ring-amber-200",
    archived: "bg-slate-100 text-slate-500 ring-slate-200",
    suspended: "bg-red-50 text-red-700 ring-red-200",
    restricted: "bg-orange-50 text-orange-800 ring-orange-200",
  };

  const key = STATUS_KEY[status];
  const label = key ? t(key) : status;

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1",
        styles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200",
      )}
    >
      {label}
    </span>
  );
}
