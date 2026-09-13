import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
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
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator, type MessageKey } from "@/i18n/messages";

export default async function HomePage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

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
    <div className="flex min-h-full flex-col bg-[var(--background)]">
      <MarketingHeader />
      <main className="flex-1">
        <section className="ys-grid-bg relative overflow-hidden text-white">
          <div className="ys-noise pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pt-24">
            <div className="animate-ys-rise">
              <BrandLogo
                variant="horizontal-white"
                className="h-14 w-auto sm:h-16"
                priority
              />
              <h1 className="mt-6 max-w-xl text-2xl font-medium leading-snug text-sand-100 sm:text-3xl">
                {t("heroHeadline")}
              </h1>
              <p className="mt-4 max-w-lg text-base text-sand-200/80 sm:text-lg">
                {t("tagline")} {t("heroSupport")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register">
                  <Button size="lg">
                    {t("ctaCreate")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/${appConfig.demoStoreSlug}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  >
                    {t("ctaDemo")}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="animate-ys-rise-delay relative">
              <div className="animate-ys-float overflow-hidden rounded-4xl border border-white/10 bg-slate-900/60 shadow-[var(--shadow)] backdrop-blur">
                <Image
                  src="https://placehold.co/1200x900/0f766e/ecfdf5/png?text=Your+storefront"
                  alt={t("brand")}
                  width={1200}
                  height={900}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" id="value">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900 sm:text-4xl">
              {t("valueTitle")}
            </h2>
            <p className="mt-4 text-lg text-slate-600">{t("valueBody")}</p>
          </div>
        </section>

        <section className="bg-white py-20" id="how">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
              {t("howTitle")}
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <li
                  key={step.titleKey}
                  className="rounded-2xl bg-[var(--background)] p-6"
                >
                  <span className="text-sm font-semibold text-brand-700">
                    {t("stepLabel", { n: index + 1 })}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900">
                    {t(step.titleKey)}
                  </h3>
                  <p className="mt-2 text-slate-600">{t(step.bodyKey)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" id="demo">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
                {t("demoTitle")}
              </h2>
              <p className="mt-4 text-slate-600">{t("demoBody")}</p>
              <Link
                href={`/${appConfig.demoStoreSlug}`}
                className="mt-6 inline-block"
              >
                <Button>
                  {t("ctaOpenDemo")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="overflow-hidden rounded-4xl shadow-[var(--shadow)] ring-1 ring-slate-200">
              <Image
                src="https://placehold.co/1200x800/0f172a/e2e8f0/png?text=Al+Noor+demo"
                alt={t("demoTitle")}
                width={1200}
                height={800}
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section className="bg-slate-950 py-20 text-white" id="features">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
              {t("featuresTitle")}
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">{t("featuresBody")}</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.titleKey}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <feature.icon className="h-5 w-5 text-brand-300" />
                  <h3 className="mt-4 text-lg font-semibold">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {t(feature.bodyKey)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
          id="analytics"
        >
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
            {t("analyticsPreviewTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            {t("analyticsPreviewBody")}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {(
              [
                "storeViews",
                "productViews",
                "whatsappClicks",
                "shares",
              ] as MessageKey[]
            ).map((label) => (
              <div
                key={label}
                className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
              >
                <p className="text-sm text-slate-500">{t(label)}</p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-slate-900">
                  —
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white py-20" id="pricing">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
              {t("pricingTitle")}
            </h2>
            <p className="mt-3 text-slate-600">{t("pricingBody")}</p>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {Object.values(PLANS).map((plan) => (
                <article
                  key={plan.id}
                  className={`rounded-2xl p-6 ring-1 ${
                    plan.highlighted
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-[var(--background)] text-slate-900 ring-slate-200"
                  }`}
                >
                  <h3 className="text-xl font-semibold">
                    {t(planNameKey[plan.id])}
                  </h3>
                  <p
                    className={`mt-2 text-sm ${plan.highlighted ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {t(planDescKey[plan.id])}
                  </p>
                  <p className="mt-6 font-[family-name:var(--font-display)] text-4xl">
                    {plan.priceMonthlyUsd === 0
                      ? t("free")
                      : `$${plan.priceMonthlyUsd}`}
                    {plan.priceMonthlyUsd ? (
                      <span className="font-sans text-base font-medium opacity-70">
                        {t("perMonth")}
                      </span>
                    ) : null}
                  </p>
                  <ul className="mt-6 space-y-2 text-sm">
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
                      className="w-full"
                      variant={plan.highlighted ? "primary" : "outline"}
                    >
                      {t("ctaGetStarted")}
                    </Button>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
          id="testimonials"
        >
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
            {t("testimonialsTitle")}
          </h2>
          <p className="mt-3 text-slate-600">{t("testimonialsBody")}</p>
          <blockquote className="mt-8 max-w-2xl rounded-2xl bg-white p-6 text-lg text-slate-700 ring-1 ring-slate-200">
            “{t("testimonialQuote")}”
            <footer className="mt-4 text-sm text-slate-500">
              {t("testimonialFooter")}
            </footer>
          </blockquote>
        </section>

        <section className="bg-white py-20" id="faq">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
              {t("faqTitle")}
            </h2>
            <div className="mt-8 space-y-4">
              {faqs.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl bg-[var(--background)] p-5 open:bg-slate-100"
                >
                  <summary className="cursor-pointer list-none font-semibold text-slate-900">
                    {t(item.q)}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {t(item.a)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="ys-grid-bg relative py-20 text-white">
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
              {t("finalCtaTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              {t("finalCtaBody")}
            </p>
            <Link href="/register" className="mt-8 inline-block">
              <Button size="lg">
                {t("ctaCreate")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
