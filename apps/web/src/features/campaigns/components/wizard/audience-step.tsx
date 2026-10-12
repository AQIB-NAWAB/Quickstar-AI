"use client";

import { CheckCircle2,FileText } from "lucide-react";
import React,{ useState } from "react";
import { parseCsvText,validateAudienceRows } from "../../lib/csv";
import type { WizardDraft } from "../../lib/types";

interface AudienceStepProps {
  draft: WizardDraft;
  onUpdate: (updated: Partial<WizardDraft>) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function AudienceStep({
  draft,
  onUpdate,
  onBack,
  onContinue,
}: AudienceStepProps) {
  const [error, setError] = useState<string | null>(null);

  // Available headers from current parsed draft or default demo
  const sampleHeaders = ["phone_number", "full_name", "email", "company"];

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds maximum client import limit of 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const parsed = parseCsvText(content);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError("CSV file contains no data rows.");
        return;
      }

      // Auto-detect phone header
      const phoneCol =
        parsed.headers.find((h) => h.toLowerCase().includes("phone")) ||
        parsed.headers[0];
      const nameCol = parsed.headers.find((h) => h.toLowerCase().includes("name"));
      const emailCol = parsed.headers.find((h) => h.toLowerCase().includes("email"));

      const validation = validateAudienceRows(parsed.rows, phoneCol, nameCol, emailCol);

      const previewRows = parsed.rows.slice(0, 3).map((r) => ({
        phone: r[phoneCol] || "",
        name: nameCol ? r[nameCol] : undefined,
        email: emailCol ? r[emailCol] : undefined,
      }));

      onUpdate({
        fileName: file.name,
        rowCount: parsed.totalRows,
        mappedColumns: {
          phone: phoneCol,
          name: nameCol,
          email: emailCol,
        },
        parsedRowsPreview: previewRows,
        validCount: validation.validCount,
        invalidCount: validation.invalidCount,
        duplicateCount: validation.duplicateCount,
      });
      setError(null);
    };

    reader.readAsText(file);
  }

  function handleContinue() {
    if (draft.validCount === 0) {
      setError("At least one valid phone contact is required to continue.");
      return;
    }
    setError(null);
    onContinue();
  }

  return (
    <div className="bg-white border border-border-faint rounded-12 p-6 shadow-xs max-w-2xl mx-auto space-y-5">
      <div>
        <h3 className="text-base font-bold text-accent-black tracking-tight">
          Step 2 &middot; Audience &amp; CSV Mapping
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Upload a contact list in CSV format and map required phone numbers.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-8">
          {error}
        </div>
      )}

      {/* File Info Box */}
      <div className="border border-border-faint rounded-10 p-4 bg-neutral-50/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 text-heat-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-accent-black">
              {draft.fileName || "demo-contacts.csv"}
            </p>
            <p className="text-xs text-neutral-400">
              {draft.rowCount || 1200} rows &middot; Sample file
            </p>
          </div>
        </div>

        <label className="cursor-pointer px-3.5 py-1.5 rounded-6 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black shadow-xs transition-colors shrink-0">
          <span>Change file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Two Column Section: Column Mapping (left) + Preview (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        {/* Left: Column Mappings */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Column Mapping
          </h4>

          <div className="space-y-1">
            <label className="text-neutral-700 font-semibold block">
              Phone <span className="text-heat-100">*</span>
            </label>
            <select
              value={draft.mappedColumns.phone}
              onChange={(e) =>
                onUpdate({
                  mappedColumns: { ...draft.mappedColumns, phone: e.target.value },
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            >
              {sampleHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-neutral-700 block">Name</label>
            <select
              value={draft.mappedColumns.name || ""}
              onChange={(e) =>
                onUpdate({
                  mappedColumns: { ...draft.mappedColumns, name: e.target.value },
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            >
              <option value="">(Unmapped)</option>
              {sampleHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-neutral-700 block">Email</label>
            <select
              value={draft.mappedColumns.email || ""}
              onChange={(e) =>
                onUpdate({
                  mappedColumns: { ...draft.mappedColumns, email: e.target.value },
                })
              }
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            >
              <option value="">(Unmapped)</option>
              {sampleHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-neutral-700 block">Custom field: Company</label>
            <select
              value="company"
              onChange={() => {}}
              className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100 font-mono"
            >
              <option value="company">company</option>
            </select>
          </div>
        </div>

        {/* Right: Preview (first 2 rows) */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Preview (first 2 rows)
          </h4>

          <div className="border border-border-faint rounded-8 overflow-x-auto bg-white">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/50 text-neutral-400 font-mono">
                  <th className="p-2">full_name</th>
                  <th className="p-2">phone_number</th>
                  <th className="p-2">email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint text-neutral-700 font-mono">
                {draft.parsedRowsPreview.slice(0, 2).map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2 truncate max-w-[90px]">{row.name || "Alex Morgan"}</td>
                    <td className="p-2 whitespace-nowrap">{row.phone || "+1 202 555 0104"}</td>
                    <td className="p-2 truncate max-w-[100px]">{row.email || "alex@example.com"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Validation status badge */}
      <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-8 flex items-center gap-2 text-xs text-emerald-800">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-medium">
          {draft.validCount} valid &middot; {draft.invalidCount} invalid &middot;{" "}
          {draft.duplicateCount} duplicates
        </span>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-border-faint">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-6 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="px-5 py-2 rounded-6 text-xs font-semibold bg-heat-100 text-white hover:bg-[#e04e10] shadow-xs transition-colors"
        >
          Continue &rarr;
        </button>
      </div>
    </div>
  );
}
