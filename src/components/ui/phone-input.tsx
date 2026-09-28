"use client";

import {
  parseIncompletePhoneNumber,
  validatePhoneNumberLength,
} from "libphonenumber-js";
import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/forms";

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onChange" | "type" | "value"
> & {
  defaultValue?: string | null;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

function normalizePhone(value: string): string {
  return parseIncompletePhoneNumber(value);
}

export function PhoneInput({
  defaultValue,
  onChange,
  ...props
}: PhoneInputProps) {
  const [value, setValue] = useState(() => normalizePhone(defaultValue ?? ""));

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = normalizePhone(event.target.value);
    if (nextValue && !nextValue.startsWith("+")) return;
    if (validatePhoneNumberLength(nextValue) === "TOO_LONG") return;

    setValue(nextValue);
    onChange?.({
      ...event,
      target: { ...event.target, value: nextValue },
      currentTarget: { ...event.currentTarget, value: nextValue },
    });
  }

  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      value={value}
      onChange={handleChange}
      maxLength={16}
    />
  );
}