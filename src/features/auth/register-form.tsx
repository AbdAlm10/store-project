"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
import { EmailField, PasswordField } from "@/features/auth/auth-fields";
import { registerAction } from "@/features/auth/actions";
import {
  AuthDivider,
  GoogleAuthButton,
} from "@/features/auth/google-auth-button";
import { useI18n } from "@/i18n/provider";

export function RegisterForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <GoogleAuthButton />
      <AuthDivider />
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await registerAction({
              email: String(formData.get("email") ?? ""),
              password: String(formData.get("password") ?? ""),
              fullName: String(formData.get("fullName") ?? ""),
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push("/onboarding");
            router.refresh();
          });
        }}
      >
        <div>
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>
        <EmailField label={t("email")} />
        <PasswordField
          id="password"
          name="password"
          label={t("password")}
          autoComplete="new-password"
          minLength={8}
          hint={t("passwordMinHint")}
        />
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("creatingAccount") : t("continue")}
        </Button>
      </form>
    </div>
  );
}
