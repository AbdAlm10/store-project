import Link from "next/link";
import { appConfig } from "@/config/app";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export default async function NotFound() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[var(--background)] px-4 text-center">
      <BrandLogo variant="vertical" className="h-28 w-auto" />
      <h1 className="mt-6 text-2xl font-semibold text-slate-900">
        {t("pageNotFound")}
      </h1>
      <p className="mt-3 text-slate-600">{t("pageNotFoundDesc")}</p>
      <Link href="/" className="mt-6 text-sm font-semibold text-brand-700">
        {t("backToBrand", { name: appConfig.name })}
      </Link>
    </div>
  );
}
