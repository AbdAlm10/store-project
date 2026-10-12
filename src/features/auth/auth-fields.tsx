"use client";

import { Input, Label } from "@/components/ui/forms";
import { useI18n } from "@/i18n/provider";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

const ltrField = "text-left placeholder:text-right";

export function EmailField({
  id = "email",
  label,
}: {
  id?: string;
  label: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        dir="ltr"
        required
        className={ltrField}
      />
    </div>
  );
}

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  minLength,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const hintId = useId();

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative" dir="ltr">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          dir="ltr"
          required
          minLength={minLength}
          aria-describedby={hint ? hintId : undefined}
          className={`pe-12 ${ltrField}`}
        />
        <button
          type="button"
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800"
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-sm text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
