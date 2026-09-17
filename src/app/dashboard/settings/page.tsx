import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/config/plans";
import { AccountSettingsForm } from "@/features/auth/account-settings-form";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator, type MessageKey } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

const PLAN_LABEL_KEY: Record<PlanId, MessageKey> = {
  trial: "planTrial",
  basic: "planBasic",
  pro: "planPro",
};

export default async function SettingsPage() {
  const services = getServices();
  const { profile } = await services.auth.requireProfile();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const subscription = await services.entitlements.getSubscription(store.id);
  const planLabel = t(PLAN_LABEL_KEY[subscription.planId]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings")} description={t("settingsDesc")} />

      <DashboardCard>
        <h2 className="text-base font-semibold text-slate-900">{t("account")}</h2>
        <AccountSettingsForm
          fullName={profile.fullName ?? ""}
          email={profile.email}
          storeId={store.id}
          storeName={store.name}
        />
      </DashboardCard>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/store"
          className="rounded-[1.25rem] border border-slate-100/80 bg-white p-5 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-brand-200/60"
        >
          <p className="font-semibold text-slate-900">{t("storefrontSettings")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {t("storefrontSettingsDesc")}
          </p>
        </Link>
        <Link
          href="/dashboard/store-design"
          className="rounded-[1.25rem] border border-slate-100/80 bg-white p-5 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-brand-200/60"
        >
          <p className="font-semibold text-slate-900">{t("design")}</p>
          <p className="mt-1 text-sm text-slate-400">{t("designCardDesc")}</p>
        </Link>
        <Link
          href="/dashboard/subscription"
          className="rounded-[1.25rem] border border-slate-100/80 bg-white p-5 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-brand-200/60"
        >
          <p className="font-semibold text-slate-900">{t("subscription")}</p>
          <p className="mt-1 text-sm text-slate-900">
            {t("subscriptionPlanType", { plan: planLabel })}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {t("subscriptionCardDesc")}
          </p>
        </Link>
        <div className="rounded-[1.25rem] border border-slate-100/80 bg-white p-5 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)]">
          <p className="font-semibold text-slate-900">{t("passwordReset")}</p>
          <p className="mt-1 text-sm text-slate-400">{t("passwordResetDesc")}</p>
          <Link href="/reset-password" className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              {t("setNewPassword")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
