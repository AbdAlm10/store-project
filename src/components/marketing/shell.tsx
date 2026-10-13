import Link from "next/link";
import { appConfig } from "@/config/app";
import { BrandLogo } from "@/components/brand/brand-logo";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { publicSupportWhatsAppUrl } from "@/lib/support-contact";

const SOCIALS = [
  {
    href: "https://www.facebook.com/profile.php?id=61594633754427",
    labelKey: "facebook" as const,
    handle: null,
  },
  {
    href: "https://www.instagram.com/dukkan4stores",
    labelKey: "instagram" as const,
    handle: "@dukkan4stores",
  },
  {
    href: "https://www.tiktok.com/@dukkan4stores",
    labelKey: "tiktok" as const,
    handle: "@dukkan4stores",
  },
];

export async function MarketingHeader() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  const nav = [
    { href: "/#features", label: t("navFeatures") },
    { href: "/#product", label: t("navProduct") },
    { href: "/pricing", label: t("navPricing") },
    { href: "/#faq", label: t("navFaq") },
  ];

  return (
    <header className="pointer-events-none sticky top-0 z-40 bg-transparent px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="pointer-events-auto mx-auto flex h-16 max-w-5xl items-center gap-2 rounded-full border border-white/50 bg-white/45 px-3 shadow-[0_10px_36px_-16px_rgba(15,23,42,0.18)] ring-1 ring-white/40 backdrop-blur-2xl sm:px-5 supports-[backdrop-filter]:bg-white/35">
        <Link href="/" className="flex shrink-0 items-center" aria-label={t("brand")}>
          <BrandLogo variant="horizontal" className="h-8 w-auto sm:h-9" priority />
        </Link>
        <MarketingNav
          links={nav}
          signInHref="/login"
          signInLabel={t("navSignIn")}
          createHref="/register"
          createLabel={t("ctaCreate")}
          openMenuLabel={t("openMenu")}
          closeMenuLabel={t("closeMenu")}
        />
      </div>
    </header>
  );
}

export async function MarketingFooter({ locale }: { locale?: Locale } = {}) {
  const resolved = locale ?? (await getRequestLocale());
  const t = createTranslator(resolved);
  const whatsapp = publicSupportWhatsAppUrl();

  const columns = [
    {
      title: t("footerProduct"),
      links: [
        { href: "/#features", label: t("navFeatures") },
        { href: "/pricing", label: t("navPricing") },
        { href: "/#faq", label: t("navFaq") },
        { href: "/alnoor", label: t("footerDemo") },
      ],
    },
    {
      title: t("footerSupport"),
      links: [
        ...(whatsapp
          ? [{ href: whatsapp, label: t("footerWhatsApp"), external: true }]
          : []),
        { href: "/login", label: t("navSignIn"), external: false },
        { href: "/register", label: t("ctaCreate"), external: false },
      ],
    },
  ];

  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="flex flex-col gap-3 md:col-span-1">
          <BrandLogo variant="horizontal" className="h-10 w-auto" />
          <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            {t("tagline")}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-semibold text-slate-900">{column.title}</h2>
            <ul className="mt-3 space-y-1">
              {column.links.map((link) => {
                const className =
                  "inline-flex min-h-11 items-center text-sm text-[var(--muted)] hover:text-brand-700";
                const external = "external" in link && link.external;
                return (
                  <li key={link.href}>
                    {external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={className}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div>
          <h2 className="text-sm font-semibold text-slate-900">{t("footerSocial")}</h2>
          <ul className="mt-3 space-y-1">
            {SOCIALS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--muted)] hover:text-brand-700"
                >
                  <span>{t(item.labelKey)}</span>
                  {item.handle ? (
                    <bdi dir="ltr" className="text-slate-500">
                      {item.handle}
                    </bdi>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {t("footerPayments")}:{" "}
            <span className="font-semibold text-slate-800">{t("footerShamCash")}</span>
          </p>
          <p>
            © {new Date().getFullYear()} {appConfig.name}. {t("footerRights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
