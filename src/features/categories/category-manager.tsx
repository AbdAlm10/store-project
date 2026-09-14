"use client";

import { useEffect, useState, useTransition } from "react";
import type {
  Category,
  CategoryOptionDef,
  CategoryOptionValue,
} from "@/domain/types/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms";
import { ImageUploadField } from "@/components/media/image-upload-field";
import {
  CategoryIcon,
  CategoryIconPicker,
} from "@/components/categories/category-icon-picker";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/features/categories/actions";
import { useI18n } from "@/i18n/provider";
import { OPTION_PRESETS, newOptionDef } from "@/lib/category-options";
import {
  isColorOptionName,
  normalizeHex,
  normalizeOptionSchema,
} from "@/lib/option-colors";
import { SafeImage } from "@/components/ui/safe-image";

export function CategoryManager({
  storeId,
  initial,
}: {
  storeId: string;
  initial: Category[];
}) {
  const { t } = useI18n();
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setCategories(initial);
  }, [initial]);

  return (
    <div className="space-y-4">
      <form
        className="space-y-4 rounded-3xl bg-white p-4 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await createCategoryAction(storeId, {
              name,
              imageUrl: imageUrl || null,
              icon,
              optionSchema: [],
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setName("");
            setImageUrl("");
            setIcon(null);
            setCategories((list) => [...list, result.category]);
          });
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("newCategoryName")}
            required
          />
          <Button type="submit" disabled={pending} className="sm:shrink-0">
            {t("add")}
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">
              {t("categoryImage")}
            </p>
            <ImageUploadField
              storeId={storeId}
              kind="category"
              name="categoryImageUrl"
              value={imageUrl}
              onChange={setImageUrl}
            />
          </div>
          <CategoryIconPicker value={icon} onChange={setIcon} />
        </div>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ul className="space-y-3">
        {categories.map((category) => (
          <li
            key={category.id}
            className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand-100 ring-1 ring-sand-200">
                  {category.imageUrl ? (
                    <SafeImage
                      src={category.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  ) : category.icon ? (
                    <CategoryIcon icon={category.icon} className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-bold text-brand-800">
                      {category.name.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {category.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {category.optionSchema.length} {t("optionAttributes")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-sm font-semibold text-brand-700"
                  onClick={() =>
                    setExpandedId((id) =>
                      id === category.id ? null : category.id,
                    )
                  }
                >
                  {expandedId === category.id ? t("close") : t("editOptions")}
                </button>
                <button
                  type="button"
                  className="text-sm font-semibold text-red-600"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      if (!confirm(t("deleteCategoryConfirm"))) return;
                      const result = await deleteCategoryAction(
                        storeId,
                        category.id,
                      );
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setExpandedId((id) =>
                        id === category.id ? null : id,
                      );
                      setCategories((list) =>
                        list.filter((item) => item.id !== category.id),
                      );
                    })
                  }
                >
                  {t("delete")}
                </button>
              </div>
            </div>
            {expandedId === category.id ? (
              <CategoryOptionsEditor
                key={`${category.id}-${category.updatedAt}`}
                storeId={storeId}
                category={category}
                pending={pending}
                startTransition={startTransition}
                onSaved={(next) => {
                  setCategories((list) =>
                    list.map((item) => (item.id === next.id ? next : item)),
                  );
                }}
                onError={setError}
              />
            ) : null}
          </li>
        ))}
        {categories.length === 0 ? (
          <li className="rounded-3xl bg-white px-4 py-8 text-center text-slate-400 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]">
            {t("noCategoriesYet")}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function CategoryOptionsEditor({
  storeId,
  category,
  pending,
  startTransition,
  onSaved,
  onError,
}: {
  storeId: string;
  category: Category;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  onSaved: (category: Category) => void;
  onError: (message: string | null) => void;
}) {
  const { t } = useI18n();
  const [options, setOptions] = useState<CategoryOptionDef[]>(() =>
    normalizeOptionSchema(category.optionSchema),
  );
  const [name, setName] = useState(category.name ?? "");
  const [imageUrl, setImageUrl] = useState(category.imageUrl ?? "");
  const [icon, setIcon] = useState<string | null>(category.icon);

  function updateOption(id: string, patch: Partial<CategoryOptionDef>) {
    setOptions((list) =>
      list.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function updateValue(
    optionId: string,
    index: number,
    patch: Partial<CategoryOptionValue>,
  ) {
    setOptions((list) =>
      list.map((item) => {
        if (item.id !== optionId) return item;
        return {
          ...item,
          values: item.values.map((value, i) =>
            i === index ? { ...value, ...patch } : value,
          ),
        };
      }),
    );
  }

  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 p-4">
      <div>
        <label className="text-xs font-medium text-slate-600">{t("name")}</label>
        <Input
          value={name ?? ""}
          onChange={(event) => setName(event.target.value)}
          className="mt-1"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-600">
            {t("categoryImage")}
          </p>
          <ImageUploadField
            storeId={storeId}
            kind="category"
            name="editCategoryImageUrl"
            value={imageUrl}
            onChange={setImageUrl}
          />
        </div>
        <CategoryIconPicker value={icon} onChange={setIcon} />
      </div>

      <div className="flex flex-wrap gap-2">
        {OPTION_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            onClick={() =>
              setOptions((list) => [
                ...list,
                newOptionDef(preset.name, preset.values, preset.kind),
              ])
            }
          >
            + {preset.name}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200"
          onClick={() => setOptions((list) => [...list, newOptionDef("")])}
        >
          + {t("customOption")}
        </button>
      </div>

      {options.map((option) => {
        const isColor = option.kind === "color" || isColorOptionName(option.name);
        return (
          <div
            key={option.id}
            className="rounded-xl bg-white p-3 ring-1 ring-slate-200"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={option.name ?? ""}
                placeholder={t("optionNamePlaceholder")}
                onChange={(event) => {
                  const nextName = event.target.value;
                  updateOption(option.id, {
                    name: nextName,
                    kind: isColorOptionName(nextName) ? "color" : option.kind,
                  });
                }}
                className="min-w-[10rem] flex-1"
              />
              <select
                value={isColor ? "color" : "text"}
                onChange={(event) =>
                  updateOption(option.id, {
                    kind: event.target.value as "color" | "text",
                  })
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-sm"
              >
                <option value="text">{t("optionKindText")}</option>
                <option value="color">{t("optionKindColor")}</option>
              </select>
              <button
                type="button"
                className="shrink-0 text-xs font-semibold text-red-600"
                onClick={() =>
                  setOptions((list) =>
                    list.filter((item) => item.id !== option.id),
                  )
                }
              >
                {t("delete")}
              </button>
            </div>

            {isColor ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-500">{t("colorValuesHint")}</p>
                {option.values.map((value, index) => {
                  const hex = normalizeHex(value.hex ?? "") ?? "#94A3B8";
                  return (
                    <div
                      key={`${option.id}-${index}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span
                        className="h-9 w-9 shrink-0 rounded-full ring-1 ring-slate-200"
                        style={{ background: hex }}
                        title={hex}
                      />
                      <Input
                        value={value.label ?? ""}
                        placeholder={t("colorLabelPlaceholder")}
                        onChange={(event) =>
                          updateValue(option.id, index, {
                            label: event.target.value,
                          })
                        }
                        className="min-w-[8rem] flex-1"
                      />
                      <Input
                        type="color"
                        value={normalizeHex(value.hex ?? "") ?? "#94A3B8"}
                        onChange={(event) =>
                          updateValue(option.id, index, {
                            hex: event.target.value.toUpperCase(),
                          })
                        }
                        className="h-10 w-12 p-1"
                      />
                      <Input
                        value={value.hex ?? ""}
                        placeholder="#FF5733"
                        onChange={(event) => {
                          const raw = event.target.value.trim();
                          updateValue(option.id, index, {
                            hex: raw ? raw.toUpperCase() : null,
                          });
                        }}
                        className="w-28 font-mono text-sm"
                      />
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600"
                        onClick={() =>
                          setOptions((list) =>
                            list.map((item) =>
                              item.id === option.id
                                ? {
                                    ...item,
                                    values: item.values.filter(
                                      (_, i) => i !== index,
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        {t("delete")}
                      </button>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateOption(option.id, {
                      values: [
                        ...option.values,
                        { label: "", hex: "#94A3B8" },
                      ],
                    })
                  }
                >
                  + {t("addColorValue")}
                </Button>
              </div>
            ) : (
              <Input
                className="mt-2"
                value={option.values
                  .map((value) => value.label ?? "")
                  .filter(Boolean)
                  .join(", ")}
                placeholder={t("optionValuesPlaceholder")}
                onChange={(event) =>
                  updateOption(option.id, {
                    values: event.target.value
                      .split(",")
                      .map((part) => part.trim())
                      .filter(Boolean)
                      .map((label) => ({ label, hex: null })),
                  })
                }
              />
            )}
          </div>
        );
      })}

      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          onError(null);
          startTransition(async () => {
            const cleaned = options
              .filter((item) => item.name.trim())
              .map((item) => ({
                ...item,
                values: item.values.filter((value) => value.label.trim()),
              }));
            const result = await updateCategoryAction(storeId, category.id, {
              name,
              imageUrl: imageUrl || null,
              icon,
              optionSchema: cleaned,
            });
            if (!result.ok) {
              onError(result.error);
              return;
            }
            onSaved(result.category);
          });
        }}
      >
        {pending ? t("saving") : t("saveOptions")}
      </Button>
    </div>
  );
}
