import Link from "next/link";
import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";

export const metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const services = getServices();
  const { profile } = await services.auth.requireProfile();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const supabaseOn = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings")} description={t("settingsDesc")} />

      <DashboardCard padding="sm" className="bg-slate-50/80">
        <p className="text-sm text-slate-500">
          Data mode:{" "}
          <span className="font-semibold text-slate-900">
            {supabaseOn ? "Supabase" : "Memory (local demo)"}
          </span>
          {supabaseOn
            ? " — users / stores / products write to your Supabase project."
            : " — set a valid NEXT_PUBLIC_SUPABASE_URL and apply SQL migrations to persist."}
        </p>
      </DashboardCard>

      <DashboardCard>
        <h2 className="text-base font-semibold text-slate-900">{t("account")}</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">{t("name")}</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {profile.fullName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">{t("email")}</dt>
            <dd className="mt-1 font-medium text-slate-900">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-slate-400">{t("role")}</dt>
            <dd className="mt-1 font-medium capitalize text-slate-900">
              {profile.platformRole}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">{t("activeStore")}</dt>
            <dd className="mt-1 font-medium text-slate-900">{store.name}</dd>
          </div>
        </dl>
      </DashboardCard>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/store"
          className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
        >
          <p className="font-semibold text-slate-900">{t("storefrontSettings")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {t("storefrontSettingsDesc")}
          </p>
        </Link>
        <Link
          href="/dashboard/store-design"
          className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
        >
          <p className="font-semibold text-slate-900">{t("design")}</p>
          <p className="mt-1 text-sm text-slate-400">{t("designCardDesc")}</p>
        </Link>
        <Link
          href="/dashboard/subscription"
          className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
        >
          <p className="font-semibold text-slate-900">{t("subscription")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {t("subscriptionCardDesc")}
          </p>
        </Link>
        <div className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]">
          <p className="font-semibold text-slate-900">{t("passwordReset")}</p>
          <p className="mt-1 text-sm text-slate-400">{t("passwordResetDesc")}</p>
          <Link href="/login" className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              {t("signInPage")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
