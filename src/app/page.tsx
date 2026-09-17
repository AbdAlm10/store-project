import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Link2,
  MessageCircle,
  Smartphone,
  Store,
} from "lucide-react";
import { appConfig } from "@/config/app";
import { PLANS } from "@/config/plans";
import { Button } from "@/components/ui/button";
import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/marketing/shell";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Reveal } from "@/components/marketing/reveal";
import { MarketingShot } from "@/components/marketing/product-frame";
import {
  MockAnalytics,
  MockDashboard,
  MockProduct,
  MockStorefront,
} from "@/components/marketing/product-mocks";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator, type MessageKey } from "@/i18n/messages";
import { existsSync } from "node:fs";
import path from "node:path";

function marketingShot(file: string): string | null {
  const abs = path.join(process.cwd(), "public", "marketing", file);
  return existsSync(abs) ? `/marketing/${file}` : null;
}

export default async function HomePage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  const storefrontShot = marketingShot("storefront.png");
  const dashboardShot = marketingShot("dashboard.png");
  const analyticsShot = marketingShot("analytics.png");
  const productShot = marketingShot("product.png");

  const steps: Array<{ titleKey: MessageKey; bodyKey: MessageKey }> = [
    { titleKey: "step1Title", bodyKey: "step1Body" },
    { titleKey: "step2Title", bodyKey: "step2Body" },
    { titleKey: "step3Title", bodyKey: "step3Body" },
  ];

  const features: Array<{
    icon: typeof Store;
    titleKey: MessageKey;
    bodyKey: MessageKey;
  }> = [
    { icon: Store, titleKey: "feature1Title", bodyKey: "feature1Body" },
    {
      icon: MessageCircle,
      titleKey: "feature2Title",
      bodyKey: "feature2Body",
    },
    { icon: Smartphone, titleKey: "feature3Title", bodyKey: "feature3Body" },
    { icon: BarChart3, titleKey: "feature4Title", bodyKey: "feature4Body" },
    { icon: Link2, titleKey: "feature5Title", bodyKey: "feature5Body" },
  ];

  const faqs: Array<{ q: MessageKey; a: MessageKey }> = [
    { q: "faq1Q", a: "faq1A" },
    { q: "faq2Q", a: "faq2A" },
    { q: "faq3Q", a: "faq3A" },
    { q: "faq4Q", a: "faq4A" },
  ];

  const planNameKey: Record<string, MessageKey> = {
    trial: "planTrial",
    basic: "planBasic",
    pro: "planPro",
  };
  const planDescKey: Record<string, MessageKey> = {
    trial: "planTrialDesc",
    basic: "planBasicDesc",
    pro: "planProDesc",
  };

  return (
    <div className="ys-landing flex min-h-full flex-col">
      <MarketingHeader />
      <main className="flex-1">
        {/* Hero — brand first, one composition, full-bleed visual */}
        <section className="ys-landing-hero-glow relative overflow-hidden">
          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-20 lg:pt-24">
            <div className="animate-ys-hero-copy flex flex-col items-center">
              <BrandLogo
                variant="vertical"
                className="h-20 w-auto sm:h-24"
                priority
              />
              <h1 className="mt-8 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl lg:leading-[1.15]">
                {t("heroHeadline")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
                {t("heroSupport")}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link href="/register">
                  <Button size="lg" className="rounded-full px-7">
                    {t("ctaCreate")}
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/${appConfig.demoStoreSlug}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-slate-200 bg-white px-7 text-slate-800 hover:bg-slate-50"
                  >
                    {t("ctaDemo")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="animate-ys-hero-visual relative mx-auto max-w-6xl px-3 pb-16 sm:px-6 lg:pb-20">
            <div className="animate-ys-soft-float">
              <MarketingShot
                src={storefrontShot}
                alt={t("showcaseStorefront")}
                label={`dukkan.app/${appConfig.demoStoreSlug}`}
                className="mx-auto"
                fallback={<MockStorefront />}
              />
            </div>
          </div>
        </section>

        {/* Value */}
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6" id="value">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {t("valueTitle")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-500">
              {t("valueBody")}
            </p>
          </Reveal>
        </section>

        {/* How */}
        <section className="px-4 py-6 sm:px-6" id="how">
          <div className="mx-auto max-w-6xl rounded-[2rem] bg-white px-5 py-14 shadow-[var(--ys-landing-shadow)] sm:px-10 lg:px-14">
            <Reveal>
              <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900">
                {t("howTitle")}
              </h2>
            </Reveal>
            <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
              {steps.map((step, index) => (
                <Reveal key={step.titleKey} delayMs={index * 90}>
                  <li className="text-center md:text-start">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-sm font-semibold text-brand-800">
                      {index + 1}
                    </span>
                    <h3 className="mt-4 text-xl font-semibold text-slate-900">
                      {t(step.titleKey)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
                      {t(step.bodyKey)}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Product showcase */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" id="product">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {t("showcaseTitle")}
              </h2>
              <p className="mt-4 text-lg text-slate-500">{t("showcaseBody")}</p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            <Reveal>
              <MarketingShot
                src={dashboardShot}
                alt={t("showcaseDashboard")}
                label={t("showcaseDashboard")}
                fallback={<MockDashboard />}
              />
            </Reveal>
            <Reveal delayMs={100}>
              <MarketingShot
                src={analyticsShot}
                alt={t("showcaseAnalytics")}
                label={t("showcaseAnalytics")}
                fallback={<MockAnalytics />}
              />
            </Reveal>
          </div>

          <Reveal delayMs={80}>
            <div className="mt-8">
              <MarketingShot
                src={productShot}
                alt={t("showcaseProduct")}
                label={t("showcaseProduct")}
                fallback={<MockProduct />}
              />
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-10 flex justify-center">
              <Link href={`/${appConfig.demoStoreSlug}`}>
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white px-6"
                >
                  {t("ctaOpenDemo")}
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Reveal>
        </section>

        {/* Features */}
        <section className="px-4 py-10 sm:px-6" id="features">
          <div className="mx-auto max-w-6xl rounded-[2rem] bg-white px-5 py-14 shadow-[var(--ys-landing-shadow)] sm:px-10 lg:px-14">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                {t("featuresTitle")}
              </h2>
              <p className="mt-3 max-w-2xl text-slate-500">{t("featuresBody")}</p>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Reveal key={feature.titleKey} delayMs={index * 70}>
                  <article className="rounded-[1.35rem] bg-[#f7f8f7] p-6 transition duration-300 hover:-translate-y-1 hover:bg-brand-50/60">
                    <feature.icon
                      className="h-5 w-5 text-brand-700"
                      strokeWidth={1.75}
                    />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {t(feature.bodyKey)}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" id="pricing">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {t("pricingTitle")}
              </h2>
              <p className="mt-4 text-lg text-slate-500">{t("pricingBody")}</p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {Object.values(PLANS).map((plan, index) => (
              <Reveal key={plan.id} delayMs={index * 90}>
                <article
                  className={`flex h-full flex-col rounded-[1.75rem] p-6 transition duration-300 hover:-translate-y-1 ${
                    plan.highlighted
                      ? "bg-slate-950 text-white shadow-[0_28px_70px_-36px_rgba(15,23,42,0.55)]"
                      : "bg-white text-slate-900 shadow-[var(--ys-landing-shadow)] ring-1 ring-slate-100"
                  }`}
                >
                  <h3 className="text-xl font-semibold">
                    {t(planNameKey[plan.id])}
                  </h3>
                  <p
                    className={`mt-2 text-sm ${plan.highlighted ? "text-slate-300" : "text-slate-500"}`}
                  >
                    {t(planDescKey[plan.id])}
                  </p>
                  <p className="mt-6 text-4xl font-semibold tracking-tight">
                    {plan.priceMonthlyUsd === 0
                      ? t("free")
                      : `$${plan.priceMonthlyUsd}`}
                    {plan.priceMonthlyUsd ? (
                      <span className="text-base font-medium opacity-60">
                        {t("perMonth")}
                      </span>
                    ) : null}
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      {t("upToProducts", { count: plan.limits.maxProducts })}
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      {plan.limits.advancedAnalytics
                        ? t("advancedAnalytics")
                        : t("basicAnalytics")}
                    </li>
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      {plan.limits.customDomain
                        ? t("customDomainReady")
                        : t("platformUrl")}
                    </li>
                  </ul>
                  <Link href="/register" className="mt-8 block">
                    <Button
                      className="w-full rounded-full"
                      variant={plan.highlighted ? "primary" : "outline"}
                    >
                      {t("ctaGetStarted")}
                    </Button>
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-10 sm:px-6" id="faq">
          <div className="mx-auto max-w-3xl rounded-[2rem] bg-white px-5 py-14 shadow-[var(--ys-landing-shadow)] sm:px-10">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                {t("faqTitle")}
              </h2>
            </Reveal>
            <div className="mt-8 space-y-3">
              {faqs.map((item, index) => (
                <Reveal key={item.q} delayMs={index * 60}>
                  <details className="group rounded-2xl bg-[#f7f8f7] px-5 py-4 open:bg-brand-50/50">
                    <summary className="cursor-pointer list-none font-semibold text-slate-900">
                      {t(item.q)}
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">
                      {t(item.a)}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-white px-6 py-16 text-center shadow-[var(--ys-landing-shadow)] sm:px-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(88_163_121/0.12),transparent_55%)]" />
              <div className="relative">
                <BrandLogo variant="icon" className="mx-auto h-12 w-12" />
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  {t("finalCtaTitle")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-slate-500">
                  {t("finalCtaBody")}
                </p>
                <Link href="/register" className="mt-8 inline-block">
                  <Button size="lg" className="rounded-full px-8">
                    {t("ctaCreate")}
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
