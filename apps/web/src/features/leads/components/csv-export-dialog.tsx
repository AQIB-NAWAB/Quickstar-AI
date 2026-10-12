"use client";

import { Check,X } from "lucide-react";
import { useState } from "react";
import {
DEFAULT_CSV_FIELD_SELECTION,
generateLeadsCsv,
triggerCsvDownload,
type CsvFieldGroupSelection,
} from "../lib/csv";
import type { LeadSummary } from "../lib/types";

interface CsvExportDialogProps {
  open: boolean;
  leads: LeadSummary[];
  workspaceSlug?: string;
  onClose: () => void;
}

export function CsvExportDialog({
  open,
  leads,
  workspaceSlug = "acme-support",
  onClose,
}: CsvExportDialogProps) {
  const [selection, setSelection] = useState<CsvFieldGroupSelection>(
    DEFAULT_CSV_FIELD_SELECTION
  );

  if (!open) return null;

  const hasAtLeastOne = Object.values(selection).some(Boolean);

  function toggleField(key: keyof CsvFieldGroupSelection) {
    setSelection((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleExport() {
    if (!hasAtLeastOne || leads.length === 0) return;

    const csvData = generateLeadsCsv(leads, selection);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `leads-${workspaceSlug}-${dateStamp}.csv`;

    triggerCsvDownload(csvData, filename);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
    >
      <div className="w-full max-w-lg bg-white rounded-12 border border-border-faint shadow-xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-start justify-between pb-2 border-b border-border-faint">
          <div>
            <h3
              id="export-dialog-title"
              className="text-sm font-bold text-accent-black tracking-tight"
            >
              Export filtered leads
            </h3>
            <p className="text-xs text-neutral-400">
              Only records included in this export are downloaded.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-6 transition-colors"
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Box */}
        <div className="p-2.5 rounded-8 bg-neutral-100/70 border border-neutral-200/60 text-xs text-neutral-700 font-medium">
          Scope: Current filtered results ({leads.length} {leads.length === 1 ? "lead" : "leads"})
        </div>

        {/* Field Selection Checkboxes */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-neutral-500  block">
            Include fields
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {[
              { key: "contact", label: "Contact" },
              { key: "intent", label: "Intent" },
              { key: "qualification", label: "Qualification" },
              { key: "sentiment", label: "Sentiment" },
              { key: "status", label: "Status" },
              { key: "tags", label: "Tags" },
              { key: "capturedAt", label: "Captured at" },
            ].map(({ key, label }) => {
              const isChecked = selection[key as keyof CsvFieldGroupSelection];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleField(key as keyof CsvFieldGroupSelection)}
                  className="flex items-center gap-2 text-xs text-neutral-700 hover:text-accent-black text-left select-none"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                      isChecked
                        ? "bg-heat-100 text-white"
                        : "border border-neutral-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border-faint">
          <p className="text-[11px] text-neutral-400">
            Export scope must match the available data contract.
          </p>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-6 text-xs font-semibold text-neutral-600 hover:text-accent-black hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!hasAtLeastOne || leads.length === 0}
              className="px-4 py-1.5 rounded-6 text-xs font-semibold bg-heat-100 text-white hover:bg-[#e04e10] disabled:opacity-50 transition-colors shadow-xs"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
