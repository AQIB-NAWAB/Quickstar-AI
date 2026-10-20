import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  primary: "button-primary text-white font-semibold",
  secondary:
    "bg-white border border-border-faint text-accent-black hover:bg-background-lighter font-semibold shadow-sm",
  ghost: "text-neutral-600 hover:text-accent-black hover:bg-neutral-50 font-medium",
};

export function Button({
  className,
  variant = "primary",
  loading,
  disabled,
  children,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-10 px-4 py-2.5 text-sm transition-all disabled:opacity-60 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}
