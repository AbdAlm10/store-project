"use client";

import { Button } from "@/components/ui/button";
import { PasswordField } from "@/features/auth/auth-fields";
import { updatePasswordAction } from "@/features/auth/actions";
import { useI18n } from "@/i18n/provider";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ResetPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");
        setError(null);

        if (password.length < 8) {
          setError(t("passwordTooShort"));
          return;
        }
        if (password.length > 72) {
          setError(t("passwordTooLong"));
          return;
        }
        if (password !== confirmPassword) {
          setError(t("passwordMismatch"));
          return;
        }

        startTransition(async () => {
          try {
            const result = await updatePasswordAction({
              password,
              confirmPassword,
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push("/dashboard/settings");
            router.refresh();
          } catch {
            setError(t("tryAgainError"));
          }
        });
      }}
    >
      <PasswordField
        id="password"
        name="password"
        label={t("newPassword")}
        autoComplete="new-password"
        minLength={8}
        hint={t("passwordMinHint")}
      />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label={t("confirmPassword")}
        autoComplete="new-password"
        minLength={8}
      />
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("saving") : t("setNewPassword")}
      </Button>
    </form>
  );
}
