import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";
import { BrandLogo } from "@/components/brand/brand-logo";
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
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-md rounded-4xl bg-white p-8 shadow-[var(--shadow)] ring-1 ring-sand-200">
        <Link href="/" className="mx-auto flex w-fit" aria-label={t("brand")}>
          <BrandLogo variant="horizontal" className="h-19 w-auto" priority />
        </Link>

        <h1 className="mt-6 text-xl font-semibold text-slate-700 text-center">
          {("تسجيل الدخول")}
        </h1>
        <div className="mt-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="flex items-center justify-center">
          <p className="mt-6 text-sm text-slate-600">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-semibold text-brand-700">
              {t("ctaCreate")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
