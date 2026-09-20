"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/forms";
import type { Store } from "@/domain/types/entities";
import { STORE_CURRENCIES } from "@/domain/types/enums";
import { CopyStoreUrl } from "@/features/dashboard/copy-store-url";
import { OpeningHoursEditor } from "@/features/stores/opening-hours-editor";
import { updateStoreAction } from "@/features/stores/update-actions";
import { useI18n } from "@/i18n/provider";
import {
  isLegacyOpeningHoursText,
  parseOpeningHours,
  serializeOpeningHours,
} from "@/lib/opening-hours";
import {
  NAVBAR_ACTION_IDS,
  NAVBAR_ACTION_LABEL_KEY,
  parseNavbarActions,
  serializeNavbarActions,
  type NavbarActionId,
} from "@/lib/navbar-actions";
import { storeUrl } from "@/lib/social/sharing";
import { cn } from "@/lib/utils/cn";
import {
  Eye,
  Facebook,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ComponentType } from "react";

const CURRENCY_LABEL: Record<(typeof STORE_CURRENCIES)[number], string> = {
  USD: "دولار",
  EUR: "يورو",
  SYP: "ليرة سورية",
  TRY: "ليرة تركية",
};

const NAV_ICONS: Record<
  NavbarActionId,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  whatsapp: MessageCircle,
  phone: Phone,
  instagram: Instagram,
  facebook: Facebook,
  telegram: Send,
  location: MapPin,
};

function defaultNavbarSelection(store: Store): NavbarActionId[] {
  const raw = store.themeOverrides?.navbarActions;
  if (typeof raw === "string") return parseNavbarActions(raw);
  return store.whatsapp?.trim() ? ["whatsapp"] : [];
}

export function StoreSettingsForm({
  store,
  maxNavActions = 1,
}: {
  store: Store;
  maxNavActions?: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"draft" | "published">(
    store.status === "published" ? "published" : "draft",
  );
  const [navActions, setNavActions] = useState<NavbarActionId[]>(() =>
    defaultNavbarSelection(store),
  );
  const [openingHours, setOpeningHours] = useState(() =>
    isLegacyOpeningHoursText(store.openingHours)
      ? serializeOpeningHours(parseOpeningHours(null))
      : (store.openingHours ??
        serializeOpeningHours(parseOpeningHours(null))),
  );
  const legacyText = isLegacyOpeningHoursText(store.openingHours)
    ? store.openingHours
    : null;
  const url = storeUrl(store.slug);
  const isPublished = status === "published";

  const fieldDefaults = useMemo(
    () => ({
      phone: store.phone ?? "",
      whatsapp: store.whatsapp ?? "",
      instagram: store.instagram ?? "",
      facebook: store.facebook ?? "",
      telegram: store.telegram ?? "",
      location: store.location ?? "",
    }),
    [store],
  );

  function toggleNavAction(id: NavbarActionId) {
    setNavActions((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      if (
        Number.isFinite(maxNavActions) &&
        current.length >= maxNavActions
      ) {
        setError(t("navActionLimitReached", { count: maxNavActions }));
        return current;
      }
      setError(null);
      return [...current, id];
    });
  }

  return (
    <form
      className="space-y-5"
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
            instagram: String(formData.get("instagram") ?? "") || null,
            facebook: String(formData.get("facebook") ?? "") || null,
            telegram: String(formData.get("telegram") ?? "") || null,
            status,
            currency: String(formData.get("currency") ?? store.currency),
            defaultLocale: "ar",
            themeOverrides: {
              ...(store.themeOverrides ?? {}),
              navbarActions: serializeNavbarActions(navActions),
            },
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <section
        className={cn(
          "rounded-2xl border p-3.5 sm:p-4",
          isPublished
            ? "border-emerald-200/80 bg-emerald-50/50"
            : "border-amber-200/80 bg-amber-50/40",
        )}
      >
        <input type="hidden" name="status" value={status} />
        <div className="flex flex-col gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStatus("published")}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-start transition",
                isPublished
                  ? "border-emerald-300 bg-white shadow-sm"
                  : "border-transparent bg-white/50 hover:border-slate-200",
              )}
            >
              <Globe
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  isPublished ? "text-emerald-600" : "text-slate-400",
                )}
                strokeWidth={1.75}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {t("published")}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  {t("storeVisibilityPublishedHint")}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatus("draft")}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-start transition",
                !isPublished
                  ? "border-amber-300 bg-white shadow-sm"
                  : "border-transparent bg-white/50 hover:border-slate-200",
              )}
            >
              <Eye
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  !isPublished ? "text-amber-600" : "text-slate-400",
                )}
                strokeWidth={1.75}
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {t("storePreviewMode")}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  {t("storeVisibilityDraftHint")}
                </span>
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200/80 sm:text-sm">
              {url}
            </code>
            <CopyStoreUrl url={url} />
            <Link href={`/${store.slug}`} target="_blank">
              <Button type="button" variant="outline" size="sm">
                {isPublished ? t("viewStore") : t("previewStore")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_8.5rem]">
          <div>
            <Label htmlFor="name">{t("storeName")}</Label>
            <Input id="name" name="name" defaultValue={store.name} required />
          </div>
          <div>
            <Label htmlFor="currency">{t("currency")}</Label>
            <Select
              id="currency"
              name="currency"
              defaultValue={
                STORE_CURRENCIES.includes(
                  store.currency as (typeof STORE_CURRENCIES)[number],
                )
                  ? store.currency
                  : "USD"
              }
            >
              {STORE_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_LABEL[code]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">{t("description")}</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={store.description ?? ""}
          />
        </div>

        <fieldset className="space-y-2">
          <div>
            <legend className="text-sm font-medium text-slate-800">
              {t("storeContactLinks")}
            </legend>
            <p className="mt-0.5 text-xs text-slate-500">
              {Number.isFinite(maxNavActions)
                ? t("storeNavIconsHintLimited", { count: maxNavActions })
                : t("storeNavIconsHint")}
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {NAVBAR_ACTION_IDS.map((id) => {
              const Icon = NAV_ICONS[id];
              const active = navActions.includes(id);
              const inputName = id;
              return (
                <div key={id} className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Label htmlFor={inputName} className="mb-0">
                      {t(NAVBAR_ACTION_LABEL_KEY[id])}
                    </Label>
                    <button
                      type="button"
                      onClick={() => toggleNavAction(id)}
                      title={t("storeNavIconToggle")}
                      aria-pressed={active}
                      aria-label={`${t("storeNavIconToggle")}: ${t(NAVBAR_ACTION_LABEL_KEY[id])}`}
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
                        active
                          ? "bg-brand-700 text-white"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  <Input
                    id={inputName}
                    name={inputName}
                    defaultValue={fieldDefaults[id]}
                    placeholder={
                      id === "whatsapp" || id === "phone"
                        ? "+963..."
                        : id === "location"
                          ? undefined
                          : "https://..."
                    }
                  />
                </div>
              );
            })}
          </div>
        </fieldset>

        <OpeningHoursEditor
          value={openingHours}
          onChange={setOpeningHours}
          legacyText={legacyText}
        />
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
