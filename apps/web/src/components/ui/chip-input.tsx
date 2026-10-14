"use client";

import { LucideIcon, X } from "lucide-react";
import React, { KeyboardEvent, useId, useState } from "react";

export interface ChipInputProps {
  label?: string;
  required?: boolean;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  maxItems?: number;
  icon?: LucideIcon;
  className?: string;
  chipClassName?: string;
}

export function ChipInput({
  label,
  required,
  values,
  onChange,
  placeholder = "Add item...",
  helperText,
  error,
  disabled = false,
  maxItems,
  icon: Icon,
  className = "",
  chipClassName = "",
}: ChipInputProps) {
  const [pending, setPending] = useState("");
  const inputId = useId();

  function commitValue(val: string) {
    const trimmed = val.trim();
    if (!trimmed) return;

    // Handle comma-separated input in one go
    const parts = trimmed
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const next = [...values];
    for (const part of parts) {
      if (maxItems && next.length >= maxItems) break;
      // Disallow exact duplicates (case-insensitive check)
      const exists = next.some((item) => item.toLowerCase() === part.toLowerCase());
      if (!exists) {
        next.push(part);
      }
    }

    onChange(next);
    setPending("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      // Prevent form submission when pressing Enter in chip input
      e.preventDefault();
      e.stopPropagation();
      commitValue(pending);
    } else if (e.key === "Backspace" && !pending && values.length > 0) {
      // Remove last chip on backspace if input is empty
      e.preventDefault();
      removeChip(values.length - 1);
    }
  }

  function handleBlur() {
    if (pending.trim()) {
      commitValue(pending);
    }
  }

  function removeChip(index: number) {
    if (disabled) return;
    const next = values.filter((_, i) => i !== index);
    onChange(next);
  }

  const reachedMax = maxItems ? values.length >= maxItems : false;

  return (
    <div className={`lead-chip-input space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5"
          >
            {label}
            {required && <span className="text-heat-100 font-bold">*</span>}
          </label>
          {maxItems && (
            <span className="text-[11px] text-neutral-400">
              {values.length}/{maxItems}
            </span>
          )}
        </div>
      )}

      <div
        className={`min-h-[44px] w-full px-3 py-1.5 rounded-8 border bg-white flex flex-wrap items-center gap-1.5 transition-colors focus-within:border-heat-100 focus-within:ring-1 focus-within:ring-heat-100 ${
          error
            ? "border-red-300"
            : disabled
            ? "bg-neutral-50 border-neutral-200 cursor-not-allowed opacity-60"
            : "border-neutral-300 hover:border-neutral-400"
        }`}
      >
        {Icon && <Icon className="w-4 h-4 text-neutral-400 shrink-0 mr-1" />}

        {values.map((val, idx) => (
          <span
            key={`${val}-${idx}`}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-6 text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200/80 animate-in fade-in duration-100 ${chipClassName}`}
          >
            <span className="min-w-0 break-words">{val}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeChip(idx);
                }}
                className="text-neutral-400 hover:text-neutral-700 rounded-full p-0.5 transition-colors focus:outline-none"
                aria-label={`Remove ${val}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {!reachedMax && !disabled && (
          <input
            id={inputId}
            type="text"
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="flex-1 min-w-[120px] bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none py-1"
            disabled={disabled}
          />
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-red-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-neutral-500">{helperText}</p>
      ) : null}
    </div>
  );
}
