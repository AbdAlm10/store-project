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
    { href: "/#how", label: t("navHow") },
    { href: "/#pricing", label: t("navPricing") },
    { href: "/#faq", label: t("navFaq") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#163024]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center" aria-label={t("brand")}>
          <BrandLogo
            variant="horizontal-white"
            className="h-9 w-auto"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-sand-200 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-sand-200 hover:text-white sm:inline"
          >
            {t("navSignIn")}
          </Link>
          <Link href="/register">
            <Button size="sm">{t("ctaCreate")}</Button>
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
    <footer className="border-t border-sand-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <BrandLogo variant="horizontal" className="h-10 w-auto" />
          <p className="text-sm text-slate-500">{t("tagline")}</p>
        </div>
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} {appConfig.name}. {t("footerRights")}
        </p>
      </div>
    </footer>
  );
}
