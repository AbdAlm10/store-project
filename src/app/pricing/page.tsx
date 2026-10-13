import { LandingAmbient } from "@/components/marketing/landing-ambient";
import { PricingSection } from "@/components/marketing/pricing-section";
import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/marketing/shell";
import { appConfig } from "@/config/app";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await getRequestLocale());
  return {
    title: t("pricingTitle"),
    description: t("pricingBody"),
    alternates: { canonical: `${appConfig.url}/pricing` },
  };
}

export default async function PricingPage() {
  const locale = await getRequestLocale();

  return (
    <div className="ys-landing relative flex min-h-full flex-col overflow-x-clip">
      <LandingAmbient />
      <MarketingHeader />
      <main className="relative flex-1">
        <PricingSection />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
