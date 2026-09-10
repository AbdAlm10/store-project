import Link from "next/link";
import { appConfig } from "@/config/app";
import { RegisterForm } from "@/features/auth/register-form";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "إنشاء متجرك",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
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
          {t("createAccountTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{t("createAccountHint")}</p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-6 text-sm text-slate-600">
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-semibold text-teal-700">
            {t("navSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
