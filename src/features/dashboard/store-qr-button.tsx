"use client";

import { Input, Label } from "@/components/ui/forms";
import type { ThemeOverrides } from "@/config/themes";
import { updateStoreAction } from "@/features/stores/update-actions";
import { useI18n } from "@/i18n/provider";
import {
  composeStoreQrExport,
  QR_STAND_DEFAULT_COLOR,
  QR_STAND_DEFAULT_LOGO_BG,
  QR_STAND_HEIGHT,
  QR_STAND_PRINT_MM,
  QR_STAND_WIDTH,
} from "@/lib/qr/store-qr";
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
  Save,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";

type Variant = "nav" | "icon";

function normalizeHex(value: string, fallback: string): string {
  const raw = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw;
  if (/^#[0-9A-Fa-f]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return fallback;
}

function resolveStandColor(
  overrides: ThemeOverrides | null | undefined,
  primaryColor: string | null | undefined,
): string {
  return normalizeHex(
    overrides?.qrStandColor ?? primaryColor ?? "",
    QR_STAND_DEFAULT_COLOR,
  );
}

function resolveLogoBg(overrides: ThemeOverrides | null | undefined): string {
  return normalizeHex(overrides?.qrLogoBg ?? "", QR_STAND_DEFAULT_LOGO_BG);
}

export function StoreQrButton({
  storeId,
  storeName,
  storeSlug,
  logoUrl,
  primaryColor,
  themeOverrides,
  variant = "nav",
}: {
  storeId: string;
  storeName: string;
  storeSlug: string;
  logoUrl?: string | null;
  /** Store accent — used as default stand gradient base. */
  primaryColor?: string | null;
  themeOverrides?: ThemeOverrides | null;
  variant?: Variant;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaultStand = resolveStandColor(themeOverrides, primaryColor);
  const defaultLogoBg = resolveLogoBg(themeOverrides);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [standSrc, setStandSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pdf" | "print" | null>(null);
  const [copied, setCopied] = useState(false);
  const [standColor, setStandColor] = useState(defaultStand);
  const [logoBg, setLogoBg] = useState(defaultLogoBg);
  const [savedStand, setSavedStand] = useState(defaultStand);
  const [savedLogoBg, setSavedLogoBg] = useState(defaultLogoBg);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const titleId = useId();
  const url = storeUrl(storeSlug);
  const dirty = standColor !== savedStand || logoBg !== savedLogoBg;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const nextStand = resolveStandColor(themeOverrides, primaryColor);
    const nextLogo = resolveLogoBg(themeOverrides);
    setSavedStand(nextStand);
    setSavedLogoBg(nextLogo);
    if (!open) {
      setStandColor(nextStand);
      setLogoBg(nextLogo);
    }
  }, [themeOverrides, primaryColor, open]);

  useEffect(() => {
    if (!open) return;
    setStandColor(resolveStandColor(themeOverrides, primaryColor));
    setLogoBg(resolveLogoBg(themeOverrides));
    setSaveError(null);
    setJustSaved(false);
  }, [open, themeOverrides, primaryColor]);
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStandSrc(null);
    const timer = window.setTimeout(() => {
      void composeStoreQrExport({
        url,
        storeName,
        logoUrl,
        standColor,
        logoBg,
      }).then((dataUrl) => {
        if (!cancelled) setStandSrc(dataUrl);
      });
    }, 120);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, url, storeName, logoUrl, standColor, logoBg]);

  function saveColors() {
    setSaveError(null);
    setJustSaved(false);
    startTransition(async () => {
      const nextStand = normalizeHex(standColor, QR_STAND_DEFAULT_COLOR);
      const nextLogo = normalizeHex(logoBg, QR_STAND_DEFAULT_LOGO_BG);
      const result = await updateStoreAction(storeId, {
        themeOverrides: {
          ...(themeOverrides ?? {}),
          qrStandColor: nextStand,
          qrLogoBg: nextLogo,
        },
      });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setStandColor(nextStand);
      setLogoBg(nextLogo);
      setSavedStand(nextStand);
      setSavedLogoBg(nextLogo);
      setJustSaved(true);
      router.refresh();
      window.setTimeout(() => setJustSaved(false), 1800);
    });
  }

  async function downloadPdf() {
    setBusy("pdf");
    try {
      const image =
        standSrc ??
        (await composeStoreQrExport({
          url,
          storeName,
          logoUrl,
          standColor,
          logoBg,
        }));
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = QR_STAND_PRINT_MM.width;
      const imgH = QR_STAND_PRINT_MM.height;
      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;
      pdf.addImage(image, "PNG", x, y, imgW, imgH);
      pdf.save(`${storeSlug}-qr-stand.pdf`);
    } finally {
      setBusy(null);
    }
  }

  async function printQr() {
    setBusy("print");
    try {
      const image =
        standSrc ??
        (await composeStoreQrExport({
          url,
          storeName,
          logoUrl,
          standColor,
          logoBg,
        }));
      const frame = window.open(
        "",
        "_blank",
        "noopener,noreferrer,width=720,height=960",
      );
      if (!frame) return;

      frame.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(storeName)} — QR Stand</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f4f4f5;
      font-family: "IBM Plex Sans Arabic", Tajawal, Cairo, system-ui, sans-serif;
    }
    img {
      width: min(90vw, ${QR_STAND_PRINT_MM.width * 3.8}px);
      height: auto;
      border-radius: 12px;
      box-shadow: 0 20px 50px -24px rgba(15,23,42,0.45);
    }
    @media print {
      body { margin: 0; background: #fff; }
      img {
        width: ${QR_STAND_PRINT_MM.width}mm;
        height: ${QR_STAND_PRINT_MM.height}mm;
        border-radius: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <img src="${image}" alt="${escapeHtml(storeName)}" width="${QR_STAND_WIDTH}" height="${QR_STAND_HEIGHT}" />
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
              className="relative z-[201] w-full max-w-[24rem] rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]"
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

              <div className="relative mx-auto w-full max-w-[15rem]">
                <div className="overflow-hidden rounded-2xl shadow-[0_16px_40px_-24px_rgba(15,23,42,0.4)] ring-1 ring-slate-100">
                  <div
                    className="relative w-full bg-slate-100"
                    style={{
                      aspectRatio: `${QR_STAND_WIDTH} / ${QR_STAND_HEIGHT}`,
                    }}
                  >
                    {standSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={standSrc}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveColors}
                  disabled={pending || !dirty}
                  aria-label={t("saveQrStand")}
                  className="absolute bottom-2 right-2 z-10 inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/40 bg-white/95 px-2.5 text-xs font-semibold text-slate-800 shadow-md backdrop-blur-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : justSaved ? (
                    <Check
                      className="h-3.5 w-3.5 text-emerald-600"
                      strokeWidth={2}
                    />
                  ) : (
                    <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                  {t("saveQrStand")}
                </button>

                {(saveError || justSaved) && (
                  <p
                    className={cn(
                      "mt-1.5 text-center text-xs",
                      saveError ? "text-rose-600" : "text-emerald-600",
                    )}
                    aria-live="polite"
                  >
                    {saveError ?? t("qrStandSaved")}
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="qr-stand-color" className="text-xs">
                    {t("qrStandColor")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="qr-stand-color"
                      type="color"
                      value={standColor}
                      onChange={(event) => setStandColor(event.target.value)}
                      className="h-10 w-12 shrink-0 p-1"
                    />
                    <Input
                      value={standColor}
                      onChange={(event) =>
                        setStandColor(
                          normalizeHex(event.target.value, defaultStand),
                        )
                      }
                      className="min-w-0 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="qr-logo-bg" className="text-xs">
                    {t("qrLogoBg")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="qr-logo-bg"
                      type="color"
                      value={logoBg}
                      onChange={(event) => setLogoBg(event.target.value)}
                      className="h-10 w-12 shrink-0 p-1"
                    />
                    <Input
                      value={logoBg}
                      onChange={(event) =>
                        setLogoBg(
                          normalizeHex(
                            event.target.value,
                            QR_STAND_DEFAULT_LOGO_BG,
                          ),
                        )
                      }
                      className="min-w-0 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => void downloadPdf()}
                  disabled={busy !== null || !standSrc}
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
                    disabled={busy !== null || !standSrc}
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
                      <Check
                        className="h-4 w-4 text-brand-600"
                        strokeWidth={2}
                      />
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
