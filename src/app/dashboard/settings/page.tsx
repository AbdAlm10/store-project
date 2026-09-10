import Link from "next/link";
import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { PageHeader } from "@/components/dashboard/page-header";
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

      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
        Data mode:{" "}
        <span className="font-semibold text-slate-900">
          {supabaseOn ? "Supabase" : "Memory (local demo)"}
        </span>
        {supabaseOn
          ? " — users / stores / products write to your Supabase project."
          : " — set a valid NEXT_PUBLIC_SUPABASE_URL and apply SQL migrations to persist."}
      </p>

      <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">{t("account")}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t("name")}</dt>
            <dd className="font-medium text-slate-900">
              {profile.fullName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("email")}</dt>
            <dd className="font-medium text-slate-900">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("role")}</dt>
            <dd className="font-medium capitalize text-slate-900">
              {profile.platformRole}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("activeStore")}</dt>
            <dd className="font-medium text-slate-900">{store.name}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/store"
          className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 hover:ring-slate-300"
        >
          <p className="font-semibold text-slate-900">{t("storefrontSettings")}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t("storefrontSettingsDesc")}
          </p>
        </Link>
        <Link
          href="/dashboard/store-design"
          className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 hover:ring-slate-300"
        >
          <p className="font-semibold text-slate-900">{t("design")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("designCardDesc")}</p>
        </Link>
        <Link
          href="/dashboard/subscription"
          className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 hover:ring-slate-300"
        >
          <p className="font-semibold text-slate-900">{t("subscription")}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t("subscriptionCardDesc")}
          </p>
        </Link>
        <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">{t("passwordReset")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("passwordResetDesc")}</p>
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
