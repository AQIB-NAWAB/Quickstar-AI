"use client";

import { Download, Loader2, X } from "lucide-react";
import { useState } from "react";
import { generateAuditCsv } from "../lib/csv";
import type { AuditEntry, AuditFilters } from "../lib/types";

interface AuditCsvExportDialogProps {
  workspaceId: string;
  entries: AuditEntry[];
  filters?: AuditFilters;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditCsvExportDialog({
  workspaceId,
  entries,
  filters,
  isOpen,
  onClose,
}: AuditCsvExportDialogProps) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  async function handleDownload() {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.fromDate) params.set("from", filters.fromDate);
      if (filters?.toDate) params.set("to", filters.toDate);
      if (filters?.actions && filters.actions.length > 0 && filters.actions[0] !== "all") {
        params.set("action", filters.actions[0]);
      }
      if (filters?.actor && filters.actor !== "all") {
        params.set("actor", filters.actor);
      }
      if (filters?.q) params.set("q", filters.q);
      const qs = params.toString();

      // Trigger server-side streaming export
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/audit/export${qs ? `?${qs}` : ""}`,
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const disposition = res.headers.get("content-disposition");
        const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
        link.setAttribute(
          "download",
          filenameMatch?.[1] || `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onClose();
        return;
      }
    } catch {
      // Fallback to client-side generation if server export fails
    }

    // Client-side fallback
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
    setDownloading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export audit log"
        className="bg-white border border-[#EAECF0] rounded-12 p-6 max-w-md w-full shadow-lg space-y-4 text-xs"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0]">
          <h2 className="text-sm font-bold text-[#18181B]">Export audit log</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#71717A] hover:text-[#18181B] p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[#52525B] leading-relaxed">
          Exporting audit records matching the current filters to CSV. Records include actor credentials,
          IP origins, timestamps, action details, and changes diff. Formula injection defense is applied
          to all fields.
        </p>

        <div className="p-3 bg-[#F8F9FB] border border-[#EAECF0] rounded-8 text-[11px] text-[#71717A] space-y-1">
          <span className="font-semibold text-[#18181B] block">Exported Columns:</span>
          <p>
            ID, Timestamp (UTC), Actor ID, Name, Email, Role, Action, Target Type, Target ID,
            Request ID, Origin IP, Country, City, User Agent, Changes Diff, Metadata.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAECF0]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-[#EAECF0] rounded-8 text-[#52525B] hover:bg-[#F8F9FB] font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF571A] hover:bg-[#E0460D] text-white rounded-8 font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{downloading ? "Exporting..." : "Download CSV"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
