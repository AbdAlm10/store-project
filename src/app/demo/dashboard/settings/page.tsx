import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { buttonVariants } from "@/components/ui/button";
import { AccountSettingsForm } from "@/features/auth/account-settings-form";
import { DEMO_DASHBOARD_BASE, demoProfile, demoStore, demoSubscription } from "@/features/demo/catalog";
import { DemoSignupButton } from "@/features/demo/demo-provider";
import type { PlanId } from "@/config/plans";
import { effectivePlanId } from "@/domain/plans/access";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator, type MessageKey } from "@/i18n/messages";
import Link from "next/link";

export const metadata = {
  title: "الإعدادات",
  robots: { index: false, follow: false },
};

const PLAN_LABEL_KEY: Record<PlanId, MessageKey> = {
  free: "planFree",
  trial: "planTrial",
  basic: "planBasic",
  pro: "planPro",
};

export default async function DemoSettingsPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const planLabel = t(PLAN_LABEL_KEY[effectivePlanId(demoSubscription)]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings")} description={t("settingsDesc")} />
      <DashboardCard>
        <h2 className="text-base font-semibold text-slate-900">{t("account")}</h2>
        <AccountSettingsForm
          fullName={demoProfile.fullName ?? ""}
          email={demoProfile.email}
          storeId={demoStore.id}
          storeName={demoStore.name}
        />
      </DashboardCard>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`${DEMO_DASHBOARD_BASE}/store`}
          className="rounded-[1.25rem] border border-slate-100/80 bg-white p-5 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-brand-200/60"
        >
          <p className="font-semibold text-slate-900">{t("storefrontSettings")}</p>
          <p className="mt-1 text-sm text-slate-400">{t("storefrontSettingsDesc")}</p>
        </Link>
        <Link
          href={`${DEMO_DASHBOARD_BASE}/store-design`}
          className="rounded-[1.25rem] border border-slate-100/80 bg-white p-5 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-brand-200/60"
        >
          <p className="font-semibold text-slate-900">{t("design")}</p>
          <p className="mt-1 text-sm text-slate-400">{t("designCardDesc")}</p>
        </Link>
        <Link
          href={`${DEMO_DASHBOARD_BASE}/subscription`}
          className="rounded-[1.25rem] border border-slate-100/80 bg-white p-5 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-brand-200/60"
        >
          <p className="font-semibold text-slate-900">{t("subscription")}</p>
          <p className="mt-1 text-sm text-slate-900">{t("subscriptionPlanType", { plan: planLabel })}</p>
          <p className="mt-1 text-sm text-slate-400">{t("subscriptionCardDesc")}</p>
        </Link>
        <div className="rounded-[1.25rem] border border-slate-100/80 bg-white p-5 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)]">
          <p className="font-semibold text-slate-900">{t("passwordReset")}</p>
          <p className="mt-1 text-sm text-slate-400">{t("passwordResetDesc")}</p>
          <DemoSignupButton className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3`}>
            {t("setNewPassword")}
          </DemoSignupButton>
        </div>
      </section>
    </div>
  );
}
