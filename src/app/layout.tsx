import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { appConfig } from "@/config/app";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { t } from "@/i18n/messages";
import { I18nProvider } from "@/i18n/provider";
import { NavigationProgress } from "@/components/navigation/navigation-progress";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
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
    icons: {
      icon: [{ url: "/brand/dukkan-icon.png", type: "image/png" }],
      apple: [{ url: "/brand/dukkan-icon.png" }],
    },
    openGraph: {
      title: appConfig.name,
      description: t(locale, "tagline"),
      type: "website",
      url: appConfig.url,
      locale: "ar_AR",
      images: [{ url: "/brand/dukkan-vertical.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title: appConfig.name,
      description: t(locale, "tagline"),
      images: ["/brand/dukkan-vertical.png"],
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
      <body
        className={`${arabic.className} min-h-full antialiased`}
      >
        <I18nProvider locale={DEFAULT_LOCALE}>
          <NavigationProgress />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
