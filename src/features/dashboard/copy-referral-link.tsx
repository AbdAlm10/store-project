"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

export function CopyReferralLink({
  url,
  copyLabel,
  copiedLabel,
}: {
  url: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      onClick={() => {
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}
