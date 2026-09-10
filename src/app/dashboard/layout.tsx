import Link from "next/link";
import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { appConfig } from "@/config/app";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { MerchantNav } from "@/components/dashboard/merchant-nav";
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
    <div className="min-h-full bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="font-[family-name:var(--font-display)] text-lg text-slate-900"
            >
              {appConfig.name}
            </Link>
            <span className="hidden text-sm text-slate-400 sm:inline">
              {t("merchant")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeStore ? (
              <Link
                href={`/${activeStore.slug}`}
                target="_blank"
                className="hidden text-sm font-medium text-teal-700 hover:underline sm:inline"
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
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr] sm:px-6">
        <aside>
          <MerchantNav storeName={activeStore?.name} locale={locale} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
