import Link from "next/link";
import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { appConfig } from "@/config/app";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { MerchantNav } from "@/components/dashboard/merchant-nav";
import { DashboardPrefetch } from "@/components/dashboard/dashboard-prefetch";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const services = getServices();
  try {
    await services.auth.requireProfile();
  } catch {
    redirect("/login");
  }

  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const stores = await services.stores.listMyStores().catch(() => []);
  const activeStore = stores[0];

  return (
    <div className="min-h-full bg-[#eef1f4]">
      <DashboardPrefetch />
      <div className="mx-auto flex min-h-full max-w-[1400px]">
        <aside className="hidden w-[260px] shrink-0 border-e border-slate-200/70 bg-[#f4f5f7] lg:block">
          <div className="sticky top-0 flex h-screen flex-col px-3 py-5">
            <Link
              href="/dashboard"
              className="mb-6 px-3 text-lg font-semibold tracking-tight text-slate-900"
            >
              {appConfig.name}
            </Link>
            <div className="ys-scrollbar-none min-h-0 flex-1 overflow-y-auto">
              <MerchantNav storeName={activeStore?.name} locale={locale} embedded />
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-200/80 px-2 pt-4">
              {activeStore ? (
                <Link
                  href={`/${activeStore.slug}`}
                  target="_blank"
                  className="block rounded-2xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
                >
                  {t("viewStore")}
                </Link>
              ) : null}
              <form action={logoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-slate-500"
                >
                  {t("navSignOut")}
                </Button>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-[#eef1f4]/90 px-4 py-3 backdrop-blur sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/dashboard"
                className="text-base font-semibold text-slate-900"
              >
                {appConfig.name}
              </Link>
              <div className="flex items-center gap-2">
                {activeStore ? (
                  <Link
                    href={`/${activeStore.slug}`}
                    target="_blank"
                    className="text-sm font-medium text-teal-700"
                  >
                    {t("viewStore")}
                  </Link>
                ) : null}
                <form action={logoutAction}>
                  <Button type="submit" variant="ghost" size="sm">
                    {t("navSignOut")}
                  </Button>
                </form>
              </div>
            </div>
            <div className="mt-2">
              <MerchantNav storeName={activeStore?.name} locale={locale} />
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
