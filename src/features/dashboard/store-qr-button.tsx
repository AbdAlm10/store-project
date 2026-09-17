"use client";

import { SafeImage } from "@/components/ui/safe-image";
import { useI18n } from "@/i18n/provider";
import { composeStoreQrExport, generateStoreQrDataUrl } from "@/lib/qr/store-qr";
import { storeUrl } from "@/lib/social/sharing";
import { cn } from "@/lib/utils/cn";
import { jsPDF } from "jspdf";
import {
  Check,
  Download,
  Link2,
  Loader2,
  Printer,
  QrCode,
  Store,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Variant = "nav" | "icon";

export function StoreQrButton({
  storeName,
  storeSlug,
  logoUrl,
  variant = "nav",
}: {
  storeName: string;
  storeSlug: string;
  logoUrl?: string | null;
  variant?: Variant;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);
  const [copied, setCopied] = useState(false);
  const titleId = useId();
  const url = storeUrl(storeSlug);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void generateStoreQrDataUrl(url).then((dataUrl) => {
      if (!cancelled) setQrSrc(dataUrl);
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, url]);

  async function downloadPdf() {
    setBusy("pdf");
    try {
      const image = await composeStoreQrExport({ url, storeName, logoUrl });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = 120;
      const imgH = (imgW * 760) / 640;
      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;
      pdf.addImage(image, "PNG", x, y, imgW, imgH);
      pdf.save(`${storeSlug}-qr.pdf`);
    } finally {
      setBusy(null);
    }
  }

  async function printQr() {
    setBusy("print");
    try {
      const image = await composeStoreQrExport({ url, storeName, logoUrl });
      const frame = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
      if (!frame) return;

      frame.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(storeName)} — QR</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #fff;
      font-family: Tajawal, Cairo, system-ui, sans-serif;
    }
    img { width: min(90vw, 420px); height: auto; }
    @media print {
      body { margin: 0; }
      img { width: 140mm; }
    }
  </style>
</head>
<body>
  <img src="${image}" alt="${escapeHtml(storeName)}" />
  <script>
    const img = document.querySelector("img");
    function go() {
      window.focus();
      window.print();
    }
    if (img.complete) go();
    else img.onload = go;
  </script>
</body>
</html>`);
      frame.document.close();
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const dialog =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label={t("close")}
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setOpen(false)}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-[201] w-full max-w-[22rem] rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id={titleId}
                    className="text-base font-semibold text-slate-900"
                  >
                    {t("storeQr")}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {t("storeQrHint")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("close")}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>

              <div className="mx-auto aspect-square w-full max-w-[18rem] rounded-2xl border border-slate-100 bg-white p-3">
                <div className="relative h-full w-full">
                  {qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrSrc}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex max-w-[42%] flex-col items-center gap-1 rounded-2xl bg-white px-2.5 py-2 shadow-[0_0_0_5px_#fff]">
                      <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-700">
                        {logoUrl ? (
                          <SafeImage
                            src={logoUrl}
                            alt={storeName}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : (
                          <Store className="h-5 w-5" strokeWidth={1.75} />
                        )}
                      </span>
                      <span className="w-full truncate text-center text-[11px] font-semibold leading-tight text-slate-800">
                        {storeName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => void downloadPdf()}
                  disabled={busy !== null || !qrSrc}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50",
                  )}
                >
                  {busy === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  {t("downloadQrPdf")}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void printQr()}
                    disabled={busy !== null || !qrSrc}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {busy === "print" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" strokeWidth={1.75} />
                    )}
                    {t("printQr")}
                  </button>

                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-brand-600" strokeWidth={2} />
                    ) : (
                      <Link2 className="h-4 w-4" strokeWidth={1.75} />
                    )}
                    {copied ? t("copied") : t("storeQrLink")}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {variant === "nav" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        >
          <QrCode className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          <span className="truncate">{t("storeQr")}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("storeQr")}
          title={t("storeQr")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
        >
          <QrCode className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      )}

      {dialog}
    </>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
