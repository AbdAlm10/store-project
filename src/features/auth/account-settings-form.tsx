"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
import { updateAccountSettingsAction } from "@/features/auth/actions";
import { useI18n } from "@/i18n/provider";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AccountSettingsForm({
  fullName,
  email,
  storeId,
  storeName,
}: {
  fullName: string;
  email: string;
  storeId: string;
  storeName: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await updateAccountSettingsAction({
            fullName: String(formData.get("fullName") ?? ""),
            storeId,
            storeName: String(formData.get("storeName") ?? ""),
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">{t("name")}</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={fullName}
            autoComplete="name"
            required
            minLength={1}
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" value={email} disabled readOnly />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="storeName">{t("storeName")}</Label>
          <Input
            id="storeName"
            name="storeName"
            defaultValue={storeName}
            required
            minLength={2}
            maxLength={80}
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-brand-700" role="status">
          {t("accountSaved")}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
