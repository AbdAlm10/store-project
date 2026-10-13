"use client";

import { Button } from "@/components/ui/button";
import { EmailField, PasswordField } from "@/features/auth/auth-fields";
import { loginAction } from "@/features/auth/actions";
import {
  AuthDivider,
  GoogleAuthButton,
} from "@/features/auth/google-auth-button";
import { useI18n } from "@/i18n/provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error") === "oauth" ? t("oauthFailed") : null,
  );
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <GoogleAuthButton />
      <AuthDivider />
      <form
        method="post"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await loginAction({
              email: String(formData.get("email") ?? ""),
              password: String(formData.get("password") ?? ""),
            });
            if (!result.ok) {
              if (result.verifyEmail) {
                router.push(
                  `/auth/verify?email=${encodeURIComponent(result.verifyEmail)}`,
                );
                return;
              }
              setError(result.error);
              return;
            }
            if (result.next === "verify") {
              router.push(`/auth/verify?email=${encodeURIComponent(result.email)}`);
              router.refresh();
              return;
            }
            router.push("/dashboard");
            router.refresh();
          });
        }}
      >
        <EmailField label={t("email")} />
        <PasswordField
          id="password"
          name="password"
          label={t("password")}
          autoComplete="current-password"
        />
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("signingIn") : t("signInTitle")}
        </Button>
      </form>
    </div>
  );
}
