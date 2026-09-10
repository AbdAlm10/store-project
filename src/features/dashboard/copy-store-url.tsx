"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

export function CopyStoreUrl({ url }: { url: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? t("copied") : t("copyUrl")}
    </Button>
  );
}
