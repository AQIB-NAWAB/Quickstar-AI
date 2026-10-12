"use client";

import { CalendarDays } from "lucide-react";
import { useRef,useState } from "react";
import { formatUtcDateRange } from "../lib/date-range";
import type { DateRange } from "../lib/types";
import { CustomDateRangeDialog } from "./custom-date-range-dialog";

interface AnalyticsDateRangeProps {
  range: DateRange;
  onSelectPreset: (preset: "7d" | "30d") => void;
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
    <div className="flex flex-col items-start sm:items-end gap-1.5 select-none">
      {/* Preset Buttons */}
      <div className="inline-flex items-center p-0.5 rounded-8 bg-neutral-100 border border-border-faint text-xs font-medium">
        <button
          type="button"
          onClick={() => onSelectPreset("7d")}
          className={`px-3 py-1 rounded-6 transition-colors ${
            range.preset === "7d"
              ? "bg-white text-accent-black font-semibold shadow-xs"
              : "text-neutral-500 hover:text-accent-black"
          }`}
          aria-pressed={range.preset === "7d"}
        >
          7d
        </button>

        <button
          type="button"
          onClick={() => onSelectPreset("30d")}
          className={`px-3 py-1 rounded-6 transition-colors ${
            range.preset === "30d"
              ? "bg-white text-accent-black font-semibold shadow-xs"
              : "text-neutral-500 hover:text-accent-black"
          }`}
          aria-pressed={range.preset === "30d"}
        >
          30d
        </button>

        <button
          ref={customButtonRef}
          type="button"
          onClick={() => setCustomDialogOpen(true)}
          className={`px-3 py-1 rounded-6 transition-colors ${
            range.preset === "custom"
              ? "bg-white text-accent-black font-semibold shadow-xs"
              : "text-neutral-500 hover:text-accent-black"
          }`}
          aria-pressed={range.preset === "custom"}
          aria-expanded={customDialogOpen}
          aria-haspopup="dialog"
        >
          Custom
        </button>
      </div>

      {/* Selected Range Readout & UTC */}
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
        <CalendarDays className="w-3.5 h-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
        <span>{formattedRange}</span>
        <span className="text-[10px] font-semibold text-neutral-400 px-1 py-0.2 bg-neutral-100 rounded border border-neutral-200">
          UTC
        </span>
      </div>

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
