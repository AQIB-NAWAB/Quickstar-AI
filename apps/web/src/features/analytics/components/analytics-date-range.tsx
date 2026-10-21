"use client";

import { Calendar, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { formatUtcDateRange } from "../lib/date-range";
import type { DateRange } from "../lib/types";
import { CustomDateRangeDialog } from "./custom-date-range-dialog";

interface AnalyticsDateRangeProps {
  range: DateRange;
  onSelectPreset: (preset: "7d" | "30d" | "90d") => void;
  onSelectCustom: (from: string, to: string) => void;
}

export function AnalyticsDateRange({
  range,
  onSelectPreset,
  onSelectCustom,
}: AnalyticsDateRangeProps) {
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const customButtonRef = useRef<HTMLButtonElement>(null);

  const formattedRange = formatUtcDateRange(range.from, range.to);

  function handleCustomClose() {
    setCustomDialogOpen(false);
    customButtonRef.current?.focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 select-none">
      {/* Preset Pills */}
      <div className="inline-flex items-center p-1 rounded-8 bg-[#F2F4F7] border border-[#EAECF0] text-xs font-medium">
        <button
          type="button"
          onClick={() => onSelectPreset("7d")}
          className={`px-3 py-1.5 rounded-6 font-semibold transition-all ${
            range.preset === "7d"
              ? "bg-[#FF571A] text-white shadow-xs"
              : "text-[#71717A] hover:text-[#18181B]"
          }`}
          aria-pressed={range.preset === "7d"}
        >
          7d
        </button>

        <button
          type="button"
          onClick={() => onSelectPreset("30d")}
          className={`px-3 py-1.5 rounded-6 font-semibold transition-all ${
            range.preset === "30d"
              ? "bg-[#FF571A] text-white shadow-xs"
              : "text-[#71717A] hover:text-[#18181B]"
          }`}
          aria-pressed={range.preset === "30d"}
        >
          30d
        </button>

        <button
          type="button"
          onClick={() => onSelectPreset("90d")}
          className={`px-3 py-1.5 rounded-6 font-semibold transition-all ${
            range.preset === "90d"
              ? "bg-[#FF571A] text-white shadow-xs"
              : "text-[#71717A] hover:text-[#18181B]"
          }`}
          aria-pressed={range.preset === "90d"}
        >
          90d
        </button>
      </div>

      {/* Date Dropdown Pill */}
      <button
        ref={customButtonRef}
        type="button"
        onClick={() => setCustomDialogOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-8 bg-white border border-[#EAECF0] text-xs font-medium text-[#18181B] hover:bg-neutral-50 shadow-xs transition-colors"
        aria-expanded={customDialogOpen}
        aria-haspopup="dialog"
      >
        <Calendar className="w-4 h-4 text-[#71717A]" aria-hidden="true" />
        <span>{formattedRange} (UTC)</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#71717A]" aria-hidden="true" />
      </button>

      {/* Custom dialog */}
      <CustomDateRangeDialog
        open={customDialogOpen}
        onClose={handleCustomClose}
        initialFrom={range.from}
        initialTo={range.to}
        onApply={onSelectCustom}
      />
    </div>
  );
}
