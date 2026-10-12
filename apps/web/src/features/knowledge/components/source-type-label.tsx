import { FileText, Link as LinkIcon, AlignLeft, HelpCircle } from "lucide-react";
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
        return <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
      case "url":
        return <LinkIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
      case "text":
        return <AlignLeft className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-neutral-600 ${className}`}>
      {renderIcon()}
      {!iconOnly && <span>{label}</span>}
    </span>
  );
}
