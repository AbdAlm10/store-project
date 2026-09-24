"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
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
              setError(result.error);
              return;
            }
            router.push("/dashboard");
            router.refresh();
          });
        }}
      >
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
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
