import { Frown,HelpCircle,Meh,Smile } from "lucide-react";
import type { LeadSentiment } from "../lib/types";

interface SentimentLabelProps {
  sentiment: LeadSentiment | string;
  className?: string;
}

export function SentimentLabel({ sentiment, className = "" }: SentimentLabelProps) {
  const norm = sentiment.toLowerCase();

  if (norm === "positive") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-neutral-700 font-medium ${className}`}>
        <Smile className="w-4 h-4 text-heat-100 shrink-0" />
        <span>Positive</span>
      </span>
    );
  }

  if (norm === "neutral") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-neutral-600 font-medium ${className}`}>
        <Meh className="w-4 h-4 text-neutral-400 shrink-0" />
        <span>Neutral</span>
      </span>
    );
  }

  if (norm === "negative") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-red-600 font-medium ${className}`}>
        <Frown className="w-4 h-4 text-red-500 shrink-0" />
        <span>Negative</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-neutral-400 ${className}`}>
      <HelpCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
      <span>{sentiment || "—"}</span>
    </span>
  );
}
