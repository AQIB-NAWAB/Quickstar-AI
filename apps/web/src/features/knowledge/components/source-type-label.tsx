import { FileText, Globe, AlignLeft, HelpCircle } from "lucide-react";
import { mapSourceKindToType } from "../lib/format";

interface SourceTypeLabelProps {
  kind: string | null | undefined;
  className?: string;
  showIcon?: boolean;
  iconOnly?: boolean;
}

export function SourceTypeLabel({
  kind,
  className = "",
  showIcon = true,
  iconOnly = false,
}: SourceTypeLabelProps) {
  const { typeKey, label } = mapSourceKindToType(kind);

  function renderIcon() {
    if (!showIcon) return null;
    switch (typeKey) {
      case "file":
        return <FileText className="w-3.5 h-3.5 text-neutral-500 shrink-0" aria-hidden="true" />;
      case "url":
        return <Globe className="w-3.5 h-3.5 text-neutral-500 shrink-0" aria-hidden="true" />;
      case "text":
        return <AlignLeft className="w-3.5 h-3.5 text-neutral-500 shrink-0" aria-hidden="true" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" aria-hidden="true" />;
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-neutral-700 font-medium ${className}`}>
      {renderIcon()}
      {!iconOnly && <span>{label}</span>}
    </span>
  );
}

interface SourceTypeIconTileProps {
  kind: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SourceTypeIconTile({
  kind,
  size = "md",
  className = "",
}: SourceTypeIconTileProps) {
  const { typeKey } = mapSourceKindToType(kind);

  const sizeClasses = {
    sm: "w-7 h-7 rounded-8 text-neutral-600",
    md: "w-9 h-9 rounded-10 text-neutral-700",
    lg: "w-11 h-11 rounded-12 text-neutral-800",
  }[size];

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }[size];

  function renderIcon() {
    switch (typeKey) {
      case "file":
        return <FileText className={iconSizes} aria-hidden="true" />;
      case "url":
        return <Globe className={iconSizes} aria-hidden="true" />;
      case "text":
        return <AlignLeft className={iconSizes} aria-hidden="true" />;
      default:
        return <HelpCircle className={iconSizes} aria-hidden="true" />;
    }
  }

  return (
    <div
      className={`bg-neutral-100 border border-neutral-200/80 flex items-center justify-center shrink-0 ${sizeClasses} ${className}`}
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
}
