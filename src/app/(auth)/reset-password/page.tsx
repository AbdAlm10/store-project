import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";

export const metadata = {
  title: "تعيين كلمة المرور",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const services = getServices();
  try {
    await services.auth.requireProfile();
  } catch {
    redirect("/login");
  }

  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-md rounded-4xl bg-white p-8 shadow-[var(--shadow)] ring-1 ring-sand-200">
        <Link href="/" className="mx-auto flex w-fit" aria-label={t("brand")}>
          <BrandLogo variant="horizontal" className="h-19 w-auto" priority />
        </Link>

        <h1 className="mt-6 text-center text-xl font-semibold text-slate-700">
          {t("setNewPassword")}
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          {t("setNewPasswordDesc")}
        </p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link
            href="/dashboard/settings"
            className="font-semibold text-brand-700"
          >
            {t("backToSettings")}
          </Link>
        </p>
      </div>
    </div>
  );
}
