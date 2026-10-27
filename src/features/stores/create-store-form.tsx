"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Input, Label, Select, Textarea } from "@/components/ui/forms";
import { STORE_CURRENCIES } from "@/domain/types/enums";
import { appConfig } from "@/config/app";
import { createStoreAction } from "@/features/stores/actions";
import { useI18n } from "@/i18n/provider";
import {
  INTERNATIONAL_PHONE_MESSAGE,
  internationalPhoneError,
} from "@/lib/phone";
import { publicStorePathPrefix } from "@/lib/public-store-prefix";

const CURRENCY_LABEL: Record<(typeof STORE_CURRENCIES)[number], string> = {
  USD: "دولار",
  EUR: "يورو",
  SYP: "ليرة سورية",
  TRY: "ليرة تركية",
};

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

export type StoreDraft = {
  name: string;
  slug: string;
  description?: string;
  currency: string;
  whatsapp?: string;
  defaultLocale?: string;
};

export function CreateStoreForm({
  onSuccess,
  redirectOnSuccess = true,
  onDraft,
  serverError = null,
}: {
  onSuccess?: () => void;
  redirectOnSuccess?: boolean;
  /** Keep the draft in the wizard. The store row is written on the last step. */
  onDraft?: (draft: StoreDraft) => void;
  /** Shown in place when a later step's save fails. Does not clear the fields. */
  serverError?: string | null;
} = {}) {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!serverError) return;
    if (serverError === INTERNATIONAL_PHONE_MESSAGE) {
      setPhoneError(serverError);
      setError(null);
      return;
    }
    setError(serverError);
    setPhoneError(null);
  }, [serverError]);

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
        const whatsapp = String(formData.get("whatsapp") ?? "");
        const phoneProblem = internationalPhoneError(whatsapp);
        if (phoneProblem) {
          setPhoneError(phoneProblem);
          setError(null);
          return;
        }
        setPhoneError(null);
        setError(null);
        const draft: StoreDraft = {
          name: String(formData.get("name") ?? ""),
          slug: nextSlug,
          description: String(formData.get("description") ?? ""),
          currency: String(formData.get("currency") ?? "USD"),
          whatsapp,
          defaultLocale: "ar",
        };
        if (onDraft) {
          onDraft(draft);
          return;
        }
        startTransition(async () => {
          const result = await createStoreAction(draft);
          if (!result.ok) {
            if (result.unauthenticated) {
              router.push("/login");
              return;
            }
            if (result.error === INTERNATIONAL_PHONE_MESSAGE) {
              setPhoneError(result.error);
              setError(null);
              return;
            }
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
          placeholder="متجر النور"
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
          <span className="shrink-0 text-sm text-slate-500">
            {publicStorePathPrefix(appConfig.url)}
          </span>
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
        <PhoneInput
          id="whatsapp"
          name="whatsapp"
          placeholder="+15550100"
          aria-invalid={phoneError ? true : undefined}
          aria-describedby={phoneError ? "whatsapp-error" : undefined}
          onChange={() => {
            if (phoneError) setPhoneError(null);
          }}
        />
        {phoneError ? (
          <p id="whatsapp-error" className="mt-1 text-sm text-red-600" role="alert">
            {phoneError}
          </p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="currency">{t("currency")}</Label>
        <Select id="currency" name="currency" defaultValue="USD">
          {STORE_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABEL[code]}
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
