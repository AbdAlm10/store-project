"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/forms";
import { createStoreAction } from "@/features/stores/actions";
import { useI18n } from "@/i18n/provider";

function toStoreSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function CreateStoreForm({
  onSuccess,
  redirectOnSuccess = true,
}: {
  onSuccess?: () => void;
  redirectOnSuccess?: boolean;
} = {}) {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextSlug =
          toStoreSlug(String(formData.get("slug") ?? "")) ||
          toStoreSlug(String(formData.get("name") ?? ""));
        setSlug(nextSlug);
        setError(null);
        startTransition(async () => {
          const result = await createStoreAction({
            name: String(formData.get("name") ?? ""),
            slug: nextSlug,
            description: String(formData.get("description") ?? ""),
            currency: String(formData.get("currency") ?? "USD"),
            whatsapp: String(formData.get("whatsapp") ?? ""),
            defaultLocale: "ar",
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          onSuccess?.();
          if (redirectOnSuccess) {
            router.push("/dashboard");
            router.refresh();
          } else {
            router.refresh();
          }
        });
      }}
    >
      <div>
        <Label htmlFor="name">{t("storeName")}</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Al Noor Store"
          value={name}
          onChange={(event) => {
            const nextName = event.target.value;
            setName(nextName);
            if (!slugTouched) {
              setSlug(toStoreSlug(nextName));
            }
          }}
        />
      </div>
      <div>
        <Label htmlFor="slug">{t("storeUrl")}</Label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-slate-500">dukkan.app/</span>
          <Input
            id="slug"
            name="slug"
            required
            placeholder="alnoor"
            value={slug}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            title={t("storeUrlHint")}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(toStoreSlug(event.target.value));
            }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">{t("storeUrlHint")}</p>
      </div>
      <div>
        <Label htmlFor="whatsapp">{t("whatsappNumber")}</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          placeholder="+15550100"
          inputMode="tel"
        />
      </div>
      <div>
        <Label htmlFor="currency">{t("currency")}</Label>
        <Select id="currency" name="currency" defaultValue="USD">
          {["USD", "EUR", "TRY", "SYP", "SAR", "AED", "GBP"].map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="description">{t("shortDescription")}</Label>
        <Textarea
          id="description"
          name="description"
          placeholder={t("whatDoYouSell")}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("creating") : t("createStore")}
      </Button>
    </form>
  );
}
