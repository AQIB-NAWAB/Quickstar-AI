import { clsx } from "clsx";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ className, label, error, id, ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="block text-xs font-semibold text-accent-black">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={clsx(
          "w-full rounded-10 border border-border-faint bg-white px-3 py-2.5 text-sm text-accent-black placeholder:text-neutral-400",
          "focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow",
          error && "border-accent-crimson focus:ring-red-100",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs text-accent-crimson">{error}</p> : null}
    </div>
  );
}
