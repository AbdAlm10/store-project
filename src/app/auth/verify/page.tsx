import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { VerifyEmailForm } from "@/features/auth/verify-email-form";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تأكيد البريد",
  robots: { index: false, follow: false },
};

type VerifyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyPageProps) {
  const query = await searchParams;
  const email = typeof query.email === "string" ? query.email : "";
  const justSent = query.sent === "1";
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  try {
    const session = await getServices().auth.requireSession();
    if (session.user.emailConfirmed) {
      redirect("/onboarding");
    }
  } catch {
    // No session yet — the signup OTP has not been confirmed.
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-md rounded-4xl bg-white p-8 shadow-[var(--shadow)] ring-1 ring-sand-200">
        <Link href="/" className="mx-auto flex w-fit" aria-label={t("brand")}>
          <BrandLogo variant="horizontal" className="h-19 w-auto" priority />
        </Link>
        <div className="text-center">
          <h1 className="mt-6 text-xl font-semibold text-slate-700">{t("verifyTitle")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("verifyBody")}</p>
        </div>
        <div className="mt-6">
          <VerifyEmailForm initialEmail={email} justSent={justSent} />
        </div>
      </div>
    </div>
  );
}
