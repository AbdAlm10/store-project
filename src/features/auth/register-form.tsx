"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
import { registerAction } from "@/features/auth/actions";
import { useI18n } from "@/i18n/provider";

export function RegisterForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
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
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("creatingAccount") : t("continue")}
      </Button>
    </form>
  );
}
