"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Store } from "@/domain/types/entities";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/forms";
import { ImageUploadField } from "@/components/media/image-upload-field";
import { updateStoreAction } from "@/features/stores/update-actions";
import { OpeningHoursEditor } from "@/features/stores/opening-hours-editor";
import { useI18n } from "@/i18n/provider";
import {
  isLegacyOpeningHoursText,
  serializeOpeningHours,
  parseOpeningHours,
} from "@/lib/opening-hours";

export function StoreSettingsForm({ store }: { store: Store }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [openingHours, setOpeningHours] = useState(() =>
    isLegacyOpeningHoursText(store.openingHours)
      ? serializeOpeningHours(parseOpeningHours(null))
      : store.openingHours ?? serializeOpeningHours(parseOpeningHours(null)),
  );
  const legacyText = isLegacyOpeningHoursText(store.openingHours)
    ? store.openingHours
    : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await updateStoreAction(store.id, {
            name: String(formData.get("name") ?? ""),
            description: String(formData.get("description") ?? "") || null,
            whatsapp: String(formData.get("whatsapp") ?? "") || null,
            phone: String(formData.get("phone") ?? "") || null,
            location: String(formData.get("location") ?? "") || null,
            openingHours: openingHours || null,
            logoUrl: String(formData.get("logoUrl") ?? "") || null,
            instagram: String(formData.get("instagram") ?? "") || null,
            facebook: String(formData.get("facebook") ?? "") || null,
            telegram: String(formData.get("telegram") ?? "") || null,
            status: String(formData.get("status") ?? "draft"),
            currency: String(formData.get("currency") ?? store.currency),
            defaultLocale: "ar",
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div>
        <Label htmlFor="name">{t("storeName")}</Label>
        <Input id="name" name="name" defaultValue={store.name} required />
      </div>
      <div>
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={store.description ?? ""}
        />
      </div>
      <div>
        <Label>{t("logoUrl")}</Label>
        <ImageUploadField
          storeId={store.id}
          kind="logo"
          name="logoUrl"
          defaultValue={store.logoUrl ?? ""}
        />
        <p className="mt-1 text-xs text-slate-500">{t("logoNavHint")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            defaultValue={store.whatsapp ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" name="phone" defaultValue={store.phone ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="location">{t("location")}</Label>
        <Input
          id="location"
          name="location"
          defaultValue={store.location ?? ""}
        />
      </div>

      <OpeningHoursEditor
        value={openingHours}
        onChange={setOpeningHours}
        legacyText={legacyText}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="instagram">{t("instagram")}</Label>
          <Input
            id="instagram"
            name="instagram"
            defaultValue={store.instagram ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="facebook">{t("facebook")}</Label>
          <Input
            id="facebook"
            name="facebook"
            defaultValue={store.facebook ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="telegram">{t("telegram")}</Label>
          <Input
            id="telegram"
            name="telegram"
            defaultValue={store.telegram ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="currency">{t("currency")}</Label>
          <Select id="currency" name="currency" defaultValue={store.currency}>
            {["USD", "EUR", "TRY", "SYP", "SAR", "AED", "GBP"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="status">{t("visibility")}</Label>
        <Select
          id="status"
          name="status"
          defaultValue={store.status === "published" ? "published" : "draft"}
        >
          <option value="draft">{t("draft")}</option>
          <option value="published">{t("published")}</option>
        </Select>
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("saveSettings")}
      </Button>
    </form>
  );
}
