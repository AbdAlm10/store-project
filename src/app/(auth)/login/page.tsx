import Link from "next/link";
import { appConfig } from "@/config/app";
import { LoginForm } from "@/features/auth/login-form";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "تسجيل الدخول",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[var(--shadow)] ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl text-slate-900"
          >
            {appConfig.name}
          </Link>
        </div>
        <h1 className="mt-6 text-xl font-semibold text-slate-900">
          {t("signInTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{t("demoLoginHint")}</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-sm text-slate-600">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-teal-700">
            {t("ctaCreate")}
          </Link>
        </p>
      </div>
    </div>
  );
}
