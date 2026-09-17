import Link from "next/link";
import { appConfig } from "@/config/app";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";

export async function MarketingHeader() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  const nav = [
    { href: "/#features", label: t("navFeatures") },
    { href: "/#product", label: t("navProduct") },
    { href: "/#pricing", label: t("navPricing") },
    { href: "/#faq", label: t("navFaq") },
  ];

  return (
    <header className="pointer-events-none sticky top-0 z-40 bg-transparent px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="pointer-events-auto mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 rounded-full border border-white/50 bg-white/45 px-4 shadow-[0_10px_36px_-16px_rgba(15,23,42,0.18)] ring-1 ring-white/40 backdrop-blur-2xl sm:h-16 sm:px-6 supports-[backdrop-filter]:bg-white/35">
        <Link href="/" className="flex items-center" aria-label={t("brand")}>
          <BrandLogo variant="horizontal" className="h-8 w-auto sm:h-9" priority />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-500 md:flex lg:gap-7">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-2.5 py-1.5 transition hover:bg-white/50 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:inline"
          >
            {t("navSignIn")}
          </Link>
          <Link href="/register">
            <Button size="sm" className="rounded-full px-4">
              {t("ctaCreate")}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export async function MarketingFooter({ locale }: { locale?: Locale } = {}) {
  const resolved = locale ?? (await getRequestLocale());
  const t = createTranslator(resolved);

  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3">
          <BrandLogo variant="horizontal" className="h-10 w-auto" />
          <p className="max-w-sm text-sm leading-relaxed text-slate-500">
            {t("tagline")}
          </p>
        </div>
        <p className="text-sm text-slate-400">
          © {new Date().getFullYear()} {appConfig.name}. {t("footerRights")}
        </p>
      </div>
    </footer>
  );
}
