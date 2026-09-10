import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import { appConfig } from "@/config/app";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { t } from "@/i18n/messages";
import { I18nProvider } from "@/i18n/provider";
import { NavigationProgress } from "@/components/navigation/navigation-progress";
import "./globals.css";

const arabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_LOCALE;
  return {
    metadataBase: new URL(appConfig.url),
    title: {
      default: `${appConfig.name} — ${t(locale, "tagline")}`,
      template: `%s · ${appConfig.name}`,
    },
    description: t(locale, "heroSupport"),
    openGraph: {
      title: appConfig.name,
      description: t(locale, "tagline"),
      type: "website",
      url: appConfig.url,
      locale: "ar_AR",
    },
    twitter: {
      card: "summary_large_image",
      title: appConfig.name,
      description: t(locale, "tagline"),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${arabic.variable} h-full`}
    >
      <body className="min-h-full font-[family-name:var(--font-arabic)] antialiased">
        <I18nProvider locale={DEFAULT_LOCALE}>
          <NavigationProgress />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
