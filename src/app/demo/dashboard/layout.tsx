import { DashboardPathsProvider } from "@/components/dashboard/dashboard-paths";
import { MerchantFrame } from "@/components/dashboard/merchant-frame";
import { DemoBanner, DemoModeProvider, DemoSignOutButton } from "@/features/demo/demo-provider";
import { SupportWidget } from "@/features/support/support-widget";
import { demoStore, demoSubscription, DEMO_DASHBOARD_BASE, DEMO_STORE_PATH } from "@/features/demo/catalog";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "لوحة التحكم التجريبية",
  robots: { index: false, follow: false },
};

export default async function DemoDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <DemoModeProvider>
      <DashboardPathsProvider value={{ base: DEMO_DASHBOARD_BASE, orders: true }}>
        <div
          className="flex h-dvh flex-col"
          style={{ ["--demo-banner-offset" as string]: "2.75rem" }}
        >
          <DemoBanner />
          <div className="min-h-0 flex-1">
            <MerchantFrame
              locale={locale}
              store={demoStore}
              subscription={demoSubscription}
              navLocked={false}
              homeHref={DEMO_DASHBOARD_BASE}
              storeHref={DEMO_STORE_PATH}
              signOut={<DemoSignOutButton label={t("navSignOut")} />}
              overlay={<SupportWidget storeId={demoStore.id} />}
            >
              {children}
            </MerchantFrame>
          </div>
        </div>
      </DashboardPathsProvider>
    </DemoModeProvider>
  );
}
