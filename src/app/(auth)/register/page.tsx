import Link from "next/link";
import { RegisterForm } from "@/features/auth/register-form";
import { BrandLogo } from "@/components/brand/brand-logo";
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
      <div className="w-full max-w-md rounded-4xl bg-white p-8 shadow-[var(--shadow)] ring-1 ring-sand-200">
        <Link href="/" className="mx-auto flex w-fit" aria-label={t("brand")}>
          <BrandLogo variant="horizontal" className="h-19 w-auto" priority />
        </Link>
        
        <div className="text-center">
        <h1 className="mt-6 text-xl font-semibold text-slate-700 text-center">
          {t("createAccountTitle")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{t("createAccountHint")}</p>
        </div>
        <div className="mt-6">
          <RegisterForm />
        </div>

        <div className="flex items-center justify-center">
        <p className="mt-6 text-sm text-slate-600">
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand-700">
            {t("navSignIn")}
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
