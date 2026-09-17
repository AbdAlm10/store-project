"use client";

import { CategoryIcon } from "@/components/categories/category-icon-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/forms";
import { SafeImage } from "@/components/ui/safe-image";
import type {
  Category,
  CategoryOptionDef,
  CategoryOptionValue,
} from "@/domain/types/entities";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/features/categories/actions";
import { CategoryMediaActions } from "@/features/categories/category-media-actions";
import { useI18n } from "@/i18n/provider";
import { OPTION_PRESETS, newOptionDef } from "@/lib/category-options";
import {
  isColorOptionName,
  normalizeHex,
  normalizeOptionSchema,
} from "@/lib/option-colors";
import { cn } from "@/lib/utils/cn";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

function cleanOptionSchema(options: CategoryOptionDef[]): CategoryOptionDef[] {
  return options
    .filter((item) => item.name.trim())
    .map((item) => ({
      ...item,
      values: item.values.filter((value) => value.label.trim()),
    }));
}

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
  const [options, setOptions] = useState<CategoryOptionDef[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setCategories(initial);
  }, [initial]);

  const editing = categories.find((c) => c.id === editingId) ?? null;
  const isEditing = Boolean(editing);

  function resetCreateForm() {
    setName("");
    setImageUrl("");
    setIcon(null);
    setOptions([]);
  }

  function startEdit(category: Category) {
    setError(null);
    setEditingId(category.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  return (
    <div className="space-y-10">
      {/* —— Create zone —— */}
      <section
        className={cn(
          "rounded-[1.5rem] bg-brand-50/50 p-5 sm:p-6",
          isEditing && "pointer-events-none opacity-40",
        )}
        aria-hidden={isEditing || undefined}
      >
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            {t("addCategoryTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{t("addCategoryHint")}</p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (isEditing) return;
            setError(null);
            startTransition(async () => {
              const result = await createCategoryAction(storeId, {
                name,
                imageUrl: imageUrl || null,
                icon,
                optionSchema: cleanOptionSchema(options),
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              resetCreateForm();
              setCategories((list) => [...list, result.category]);
            });
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("newCategoryName")}
              required
              disabled={isEditing}
              className="bg-white"
            />
            <Button
              type="submit"
              disabled={pending || isEditing}
              className="sm:shrink-0"
            >
              {pending && !isEditing ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2} />
              )}
              {pending && !isEditing ? t("saving") : t("add")}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("categoryVisualOptional")}
            </p>
            <CategoryMediaActions
              storeId={storeId}
              imageUrl={imageUrl}
              icon={icon}
              onImageUrlChange={setImageUrl}
              onIconChange={setIcon}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("categoryOptionsOptional")}
            </p>
            <CategoryOptionsFields options={options} onChange={setOptions} />
          </div>
        </form>
      </section>

      {error && !isEditing ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {/* —— List zone —— */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            {t("yourCategories")}
            {categories.length > 0 ? (
              <span className="ms-2 text-sm font-medium text-slate-400">
                ({categories.length})
              </span>
            ) : null}
          </h2>
        </div>

        {categories.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
            {t("noCategoriesYet")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl bg-white">
            {categories.map((category) => {
              const isThisEditing = editingId === category.id;
              return (
                <li key={category.id}>
                  <div
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 px-1 py-3.5 sm:px-2",
                      isThisEditing && "bg-slate-50/80",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50">
                        {category.imageUrl ? (
                          <SafeImage
                            src={category.imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : category.icon ? (
                          <CategoryIcon
                            icon={category.icon}
                            className="h-5 w-5"
                          />
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
                        <p className="text-xs text-slate-400">
                          {category.optionSchema.length} {t("optionAttributes")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {isThisEditing ? (
                        <button
                          type="button"
                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-200/80 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                          onClick={cancelEdit}
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {t("cancelEdit")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
                          disabled={isEditing}
                          onClick={() => startEdit(category)}
                        >
                          <Pencil
                            className="h-3.5 w-3.5"
                            strokeWidth={1.75}
                          />
                          {t("editCategory")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-50 px-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        disabled={pending || (isEditing && !isThisEditing)}
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
                            if (editingId === category.id) setEditingId(null);
                            setCategories((list) =>
                              list.filter((item) => item.id !== category.id),
                            );
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {t("delete")}
                      </button>
                    </div>
                  </div>

                  {isThisEditing && editing ? (
                    <CategoryEditPanel
                      key={`${editing.id}-${editing.updatedAt}`}
                      storeId={storeId}
                      category={editing}
                      pending={pending}
                      startTransition={startTransition}
                      onSaved={(next) => {
                        setCategories((list) =>
                          list.map((item) =>
                            item.id === next.id ? next : item,
                          ),
                        );
                        setEditingId(null);
                      }}
                      onCancel={cancelEdit}
                      onError={setError}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {error && isEditing ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function CategoryOptionsFields({
  options,
  onChange,
}: {
  options: CategoryOptionDef[];
  onChange: (options: CategoryOptionDef[]) => void;
}) {
  const { t } = useI18n();

  function updateOption(id: string, patch: Partial<CategoryOptionDef>) {
    onChange(
      options.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function updateValue(
    optionId: string,
    index: number,
    patch: Partial<CategoryOptionValue>,
  ) {
    onChange(
      options.map((item) => {
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {OPTION_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
            onClick={() =>
              onChange([
                ...options,
                newOptionDef(preset.name, preset.values, preset.kind),
              ])
            }
          >
            + {preset.name}
          </button>
        ))}
        <button
          type="button"
          className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
          onClick={() => onChange([...options, newOptionDef("")])}
        >
          + {t("customOption")}
        </button>
      </div>

      {options.map((option) => {
        const isColor =
          option.kind === "color" || isColorOptionName(option.name);
        return (
          <div key={option.id} className="space-y-2 rounded-xl bg-white/80 p-3">
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
                className="min-w-[10rem] flex-1 bg-white"
              />
              <select
                value={isColor ? "color" : "text"}
                onChange={(event) =>
                  updateOption(option.id, {
                    kind: event.target.value as "color" | "text",
                  })
                }
                className="h-10 rounded-xl border-0 bg-slate-100 px-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="text">{t("optionKindText")}</option>
                <option value="color">{t("optionKindColor")}</option>
              </select>
              <button
                type="button"
                className="shrink-0 text-xs font-semibold text-red-600"
                onClick={() =>
                  onChange(options.filter((item) => item.id !== option.id))
                }
              >
                {t("delete")}
              </button>
            </div>

            {isColor ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">{t("colorValuesHint")}</p>
                {option.values.map((value, index) => {
                  const hex = normalizeHex(value.hex ?? "") ?? "#94A3B8";
                  return (
                    <div
                      key={`${option.id}-${index}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span
                        className="h-9 w-9 shrink-0 rounded-full"
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
                        className="min-w-[8rem] flex-1 bg-white"
                      />
                      <Input
                        type="color"
                        value={normalizeHex(value.hex ?? "") ?? "#94A3B8"}
                        onChange={(event) =>
                          updateValue(option.id, index, {
                            hex: event.target.value.toUpperCase(),
                          })
                        }
                        className="h-10 w-12 bg-transparent p-1"
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
                        className="w-28 bg-white font-mono text-sm"
                      />
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600"
                        onClick={() =>
                          onChange(
                            options.map((item) =>
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
                className="bg-white"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CategoryEditPanel({
  storeId,
  category,
  pending,
  startTransition,
  onSaved,
  onCancel,
  onError,
}: {
  storeId: string;
  category: Category;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  onSaved: (category: Category) => void;
  onCancel: () => void;
  onError: (message: string | null) => void;
}) {
  const { t } = useI18n();
  const [options, setOptions] = useState<CategoryOptionDef[]>(() =>
    normalizeOptionSchema(category.optionSchema),
  );
  const [name, setName] = useState(category.name ?? "");
  const [imageUrl, setImageUrl] = useState(category.imageUrl ?? "");
  const [icon, setIcon] = useState<string | null>(category.icon);

  return (
    <div className="mb-3 space-y-5 rounded-2xl bg-slate-50 px-4 py-5 sm:px-5">
      <p className="text-sm font-semibold text-slate-800">
        {t("editingCategory", { name: category.name })}
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500">{t("name")}</label>
        <Input
          value={name ?? ""}
          onChange={(event) => setName(event.target.value)}
          className="bg-white"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("categoryVisualOptional")}
        </p>
        <CategoryMediaActions
          storeId={storeId}
          imageUrl={imageUrl}
          icon={icon}
          onImageUrlChange={setImageUrl}
          onIconChange={setIcon}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("categoryOptionsOptional")}
        </p>
        <CategoryOptionsFields options={options} onChange={setOptions} />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            onError(null);
            startTransition(async () => {
              const result = await updateCategoryAction(storeId, category.id, {
                name,
                imageUrl: imageUrl || null,
                icon,
                optionSchema: cleanOptionSchema(options),
              });
              if (!result.ok) {
                onError(result.error);
                return;
              }
              onSaved(result.category);
            });
          }}
        >
          {pending ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : null}
          {pending ? t("saving") : t("saveCategory")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          {t("cancelEdit")}
        </Button>
      </div>
    </div>
  );
}
