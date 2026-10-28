import { DashboardPrefetch } from "@/components/dashboard/dashboard-prefetch";
import { MerchantFrame } from "@/components/dashboard/merchant-frame";
import { logoutAction } from "@/features/auth/actions";
import { SupportWidget } from "@/features/support/support-widget";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import { getDashboardProfile, getDashboardStores } from "@/lib/dashboard-request";
import { LogOut } from "lucide-react";
import { redirect, unstable_rethrow } from "next/navigation";
import { isUnauthenticatedError } from "@/domain/errors";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let dashboardAuth: Awaited<ReturnType<typeof getDashboardProfile>>;
  try {
    dashboardAuth = await getDashboardProfile();
  } catch (error) {
    unstable_rethrow(error);
    if (isUnauthenticatedError(error)) redirect("/login");
    throw error;
  }
  if (!dashboardAuth.session.user.emailConfirmed) {
    redirect(`/auth/verify?email=${encodeURIComponent(dashboardAuth.session.user.email)}`);
  }

  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const stores = await getDashboardStores().catch(() => []);
  const activeStore = stores[0] ?? null;
  const services = getServices();
  const subscription = activeStore
    ? await services.entitlements.getSubscription(activeStore.id).catch(() => null)
    : null;
  const navLocked = activeStore?.status === "restricted" || activeStore?.status === "suspended";

  return (
    <div className="h-dvh">
      <MerchantFrame
        locale={locale}
        store={activeStore}
        subscription={subscription}
        navLocked={navLocked}
        homeHref="/dashboard"
        storeHref={activeStore ? `/${activeStore.slug}` : null}
        extras={<DashboardPrefetch />}
        overlay={<SupportWidget storeId={activeStore?.id ?? null} />}
        signOut={
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              <span className="truncate">{t("navSignOut")}</span>
            </button>
          </form>
        }
      >
        {children}
      </MerchantFrame>
    </div>
  );
}
