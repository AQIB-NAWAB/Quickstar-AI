"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  isNew?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  isNew = false,
  id = "password",
  name = "password",
  placeholder,
  required = true,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const effectivePlaceholder =
    placeholder ?? (isNew ? "Create a password" : "Enter your password");

  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">
        Password
      </label>
      <div className="auth-pw-wrap">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={isNew ? "new-password" : "current-password"}
          required={required}
          minLength={isNew ? 8 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={effectivePlaceholder}
          className="auth-input"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="auth-eye-btn"
        >
          {visible ? (
            <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
              <circle cx="12" cy="12" r="2.8" />
            </svg>
          )}
        </button>
      </div>
      {isNew ? (
        <p className="auth-hint">Use at least 8 characters.</p>
      ) : null}
    </div>
  );
}
