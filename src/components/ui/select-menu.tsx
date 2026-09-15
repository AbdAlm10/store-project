"use client";

import { cn } from "@/lib/utils/cn";
import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

type Option = { value: string; label: string; disabled?: boolean };

function optionLabel(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(optionLabel).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return optionLabel(children.props.children);
  }
  return "";
}

function collectOptions(children: ReactNode): Option[] {
  const options: Option[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    }>;
    const type = element.type;
    if (type !== "option") return;
    options.push({
      value: String(element.props.value ?? ""),
      label: optionLabel(element.props.children),
      disabled: Boolean(element.props.disabled),
    });
  });

  return options;
}

export function Select({
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  name,
  id,
  "aria-label": ariaLabel,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = useMemo(() => collectOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(
    String(defaultValue ?? options[0]?.value ?? ""),
  );
  const selected = isControlled ? String(value) : internal;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectedLabel =
    options.find((option) => option.value === selected)?.label ?? selected;

  function commit(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.({
      target: { value: next, name: name ?? "" },
      currentTarget: { value: next, name: name ?? "" },
    } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <select
        {...props}
        id={id}
        name={name}
        disabled={disabled}
        aria-hidden
        tabIndex={-1}
        className="sr-only"
        value={selected}
        onChange={(event) => commit(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-brand-300 ring-2 ring-brand-300",
        )}
      >
        <span className="min-w-0 truncate text-start">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition",
            open && "rotate-180 text-brand-600",
          )}
          strokeWidth={1.75}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-50 max-h-60 overflow-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)]"
        >
          {options.map((option) => {
            const active = option.value === selected;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={option.disabled}
                  onClick={() => commit(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-start text-sm transition",
                    active
                      ? "bg-brand-50 font-semibold text-brand-900"
                      : "text-slate-700 hover:bg-slate-50",
                    option.disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {active ? (
                    <Check className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={2} />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
