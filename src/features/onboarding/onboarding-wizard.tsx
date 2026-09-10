"use client";

import { useState } from "react";
import Link from "next/link";
import { appConfig } from "@/config/app";
import { Button } from "@/components/ui/button";
import { CreateStoreForm } from "@/features/stores/create-store-form";
import { useI18n } from "@/i18n/provider";

const stepKeys = [
  "onboardingWelcome",
  "onboardingCreateStore",
  "onboardingNextSteps",
] as const;

export function OnboardingWizard() {
  const { t } = useI18n();
  const [step, setStep] = useState(1);

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-4 py-12">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl text-slate-900"
        >
          {appConfig.name}
        </Link>
      </div>

      <ol className="mt-8 flex gap-2">
        {stepKeys.map((key, index) => (
          <li
            key={key}
            className={`h-1.5 flex-1 rounded-full ${
              index + 1 <= step ? "bg-teal-600" : "bg-slate-200"
            }`}
            aria-current={index + 1 === step ? "step" : undefined}
          />
        ))}
      </ol>
      <p className="mt-3 text-sm text-slate-500">
        {t("stepOf", { current: step, total: 3 })} · {t(stepKeys[step - 1])}
      </p>

      {step === 1 ? (
        <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-slate-900">
            {t("onboardingTitle")}
          </h1>
          <p className="mt-3 text-slate-600">{t("onboardingBody")}</p>
          <ul className="mt-6 space-y-2 text-sm text-slate-700">
            <li>✓ {t("onboardingBullet1")}</li>
            <li>✓ {t("onboardingBullet2")}</li>
            <li>✓ {t("onboardingBullet3")}</li>
            <li>✓ {t("onboardingBullet4")}</li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => setStep(2)}>{t("continue")}</Button>
            <Button variant="ghost" onClick={() => setStep(2)}>
              {t("skipIntro")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t("onboardingNameTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{t("onboardingNameHint")}</p>
          <div className="mt-6">
            <CreateStoreForm
              onSuccess={() => setStep(3)}
              redirectOnSuccess={false}
            />
          </div>
          <button
            type="button"
            className="mt-4 text-sm text-slate-500 hover:text-slate-800"
            onClick={() => setStep(1)}
          >
            ← {t("back")}
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-slate-200">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-slate-900">
            {t("onboardingReadyTitle")}
          </h1>
          <p className="mt-3 text-slate-600">{t("onboardingReadyBody")}</p>
          <ol className="mt-6 list-decimal space-y-2 ps-5 text-sm text-slate-700">
            <li>{t("onboardingReadyStep1")}</li>
            <li>{t("onboardingReadyStep2")}</li>
            <li>{t("onboardingReadyStep3")}</li>
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard/products/new">
              <Button>{t("addFirstProduct")}</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">{t("goToDashboard")}</Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
