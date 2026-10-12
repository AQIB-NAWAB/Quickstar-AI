"use client";

import { AlertCircle,Calendar,X } from "lucide-react";
import React,{ useEffect,useId,useRef,useState } from "react";
import { getUtcTodayDateString,validateCustomDateRange } from "../lib/date-range";

interface CustomDateRangeDialogProps {
  open: boolean;
  onClose: () => void;
  initialFrom: string;
  initialTo: string;
  onApply: (from: string, to: string) => void;
}

export function CustomDateRangeDialog({
  open,
  onClose,
  initialFrom,
  initialTo,
  onApply,
}: CustomDateRangeDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);

  const [fromDraft, setFromDraft] = useState(initialFrom);
  const [toDraft, setToDraft] = useState(initialTo);
  const [error, setError] = useState<string | null>(null);

  const errorId = useId();
  const titleId = useId();

  const todayUtc = getUtcTodayDateString();

  useEffect(() => {
    if (open) {
      setFromDraft(initialFrom);
      setToDraft(initialTo);
      setError(null);

      // Focus first input
      setTimeout(() => {
        startInputRef.current?.focus();
      }, 50);
    }
  }, [open, initialFrom, initialTo]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateCustomDateRange(fromDraft, toDraft, todayUtc);
    if (!validation.valid) {
      setError(validation.error || "Please enter a valid date range.");
      return;
    }

    onApply(fromDraft, toDraft);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm bg-white rounded-12 border border-border-faint shadow-xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95 duration-100"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border-faint">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-heat-100" />
            <h2 id={titleId} className="text-sm font-bold text-accent-black">
              Custom date range
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-6 transition-colors"
            aria-label="Close custom date range dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="custom-date-start"
                className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block"
              >
                Start date (UTC)
              </label>
              <input
                ref={startInputRef}
                id="custom-date-start"
                type="date"
                max={todayUtc}
                value={fromDraft}
                onChange={(e) => {
                  setFromDraft(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="custom-date-end"
                className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block"
              >
                End date (UTC)
              </label>
              <input
                id="custom-date-end"
                type="date"
                max={todayUtc}
                value={toDraft}
                onChange={(e) => {
                  setToDraft(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
                required
              />
            </div>

            <p className="text-[11px] text-neutral-400">
              Aggregated in UTC timezone. Maximum 366 days.
            </p>
          </div>

          {error && (
            <div
              id={errorId}
              className="p-2.5 bg-red-50 border border-red-200 rounded-8 flex items-start gap-2 text-red-600 text-[11px]"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-faint">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-8 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-8 bg-heat-100 text-white hover:bg-heat-100/90 transition-colors shadow-sm"
            >
              Apply range
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
