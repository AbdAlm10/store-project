"use client";

import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";
import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function CopyStoreUrl({ url }: { url: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
    >
      {copied ? t("copied") : t("copyUrl")}
    </button>
  );
}

/** Compact share/copy control for inline URL rows */
export function ShareStoreLinkButton({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ url });
        return;
      }
    } catch {
      // Fall through to clipboard (user cancel or unsupported).
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? t("copied") : t("share")}
      title={copied ? t("copied") : t("share")}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-brand-700",
        copied && "text-brand-600",
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4" strokeWidth={2} />
      ) : (
        <Share2 className="h-4 w-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
