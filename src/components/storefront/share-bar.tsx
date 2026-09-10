"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Send, Share2 } from "lucide-react";
import { socialShareLinks } from "@/lib/social/sharing";
import { useI18n } from "@/i18n/provider";

export function ShareBar({
  url,
  text,
  onShared,
}: {
  url: string;
  text: string;
  onShared?: (channel: string) => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const links = socialShareLinks(url, text);

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    onShared?.("copy");
    setTimeout(() => setCopied(false), 1600);
  }

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ title: text, text, url });
      onShared?.("native");
    }
  }

  const chipStyle = {
    background: "var(--store-card, #fff)",
    color: "var(--store-text, #0f172a)",
    boxShadow: "inset 0 0 0 1px var(--store-border, #e2e8f0)",
    borderRadius: "calc(var(--store-radius, 1rem) * 0.55)",
  } as const;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold transition active:scale-[0.98]"
        style={chipStyle}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? t("copied") : t("copyLink")}
      </button>
      <a
        href={links.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onShared?.("whatsapp")}
        className="inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold transition active:scale-[0.98]"
        style={chipStyle}
      >
        {t("whatsapp")}
      </a>
      <a
        href={links.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold transition active:scale-[0.98]"
        style={chipStyle}
        onClick={() => onShared?.("facebook")}
      >
        {t("facebook")}
      </a>
      <a
        href={links.telegram}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold transition active:scale-[0.98]"
        style={chipStyle}
        onClick={() => onShared?.("telegram")}
      >
        <Send className="h-4 w-4" />
        {t("telegram")}
      </a>
      {canNativeShare ? (
        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex h-9 items-center gap-2 px-3 text-sm font-semibold transition active:scale-[0.98]"
          style={chipStyle}
        >
          <Share2 className="h-4 w-4" />
          {t("share")}
        </button>
      ) : null}
    </div>
  );
}
