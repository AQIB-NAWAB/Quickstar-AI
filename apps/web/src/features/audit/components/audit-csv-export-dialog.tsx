"use client";

import { Download,X } from "lucide-react";
import { generateAuditCsv } from "../lib/csv";
import type { AuditEntry } from "../lib/types";

interface AuditCsvExportDialogProps {
  entries: AuditEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export function AuditCsvExportDialog({
  entries,
  isOpen,
  onClose,
}: AuditCsvExportDialogProps) {
  if (!isOpen) return null;

  function handleDownload() {
    const csvContent = generateAuditCsv(entries);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `audit-log-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Export audit log" className="bg-white border border-border-faint rounded-12 p-6 max-w-md w-full shadow-lg space-y-4 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border-faint">
          <h2 className="text-sm font-bold text-accent-black">Export audit log</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-neutral-400 hover:text-accent-black p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-neutral-600 leading-relaxed">
          Exporting <span className="font-semibold text-accent-black">{entries.length}</span> loaded
          filtered audit records to CSV. Formula injection protection is applied to text fields.
        </p>

        <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-8 text-[11px] text-neutral-500 space-y-1">
          <span className="font-semibold text-accent-black block">Exported Columns:</span>
          <p>
            Entry ID, Actor ID, Actor Type, Actor Name, Action, Resource Type, Resource ID, Resource Name, Timestamp UTC, Request ID.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-faint">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-neutral-200 rounded-8 text-neutral-600 hover:bg-neutral-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-heat-100 hover:bg-heat-200 text-white rounded-8 font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
