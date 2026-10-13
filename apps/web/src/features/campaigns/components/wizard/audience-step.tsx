"use client";

import { CheckCircle2, FileText } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  buildDefaultMappings,
  parseCsvText,
  validateAudienceWithMappings,
} from "../../lib/csv";
import type { AudienceFieldRole, ColumnMapping, WizardDraft } from "../../lib/types";

interface AudienceStepProps {
  draft: WizardDraft;
  onUpdate: (updated: Partial<WizardDraft>) => void;
  onBack: () => void;
  onContinue: () => void;
}

const ROLE_OPTIONS: { value: AudienceFieldRole | "skip"; label: string }[] = [
  { value: "dial", label: "Dial (phone) *" },
  { value: "identity", label: "Name / identity" },
  { value: "contact_email", label: "Email" },
  { value: "custom", label: "Custom attribute" },
  { value: "skip", label: "Skip column" },
];

export function AudienceStep({
  draft,
  onUpdate,
  onBack,
  onContinue,
}: AudienceStepProps) {
  const [error, setError] = useState<string | null>(null);
  const headers = draft.csvHeaders.length > 0 ? draft.csvHeaders : [];

  const previewHeaders = useMemo(() => {
    const mapped = draft.columnMappings.filter((m) => m.role !== undefined);
    return mapped.slice(0, 4).map((m) => m.sourceColumn);
  }, [draft.columnMappings]);

  function applyMappings(
    parsedRows: Record<string, string>[],
    mappings: ColumnMapping[],
    fileMeta?: { fileName: string; rowCount: number; csvHeaders?: string[] },
  ) {
    const active = mappings.filter(Boolean);
    const validation = validateAudienceWithMappings(parsedRows, active);
    const dial = active.find((m) => m.role === "dial");
    const identity = active.find((m) => m.role === "identity");
    const email = active.find((m) => m.role === "contact_email");

    const customFields: Record<string, string> = {};
    for (const m of active) {
      if (m.role === "custom") customFields[m.key] = m.sourceColumn;
    }

    onUpdate({
      ...(fileMeta ?? {}),
      csvHeaders:
        fileMeta?.csvHeaders ??
        (draft.csvHeaders.length > 0
          ? draft.csvHeaders
          : Object.keys(parsedRows[0] ?? {})),
      parsedRows,
      columnMappings: active,
      mappedColumns: {
        phone: dial?.sourceColumn ?? "",
        name: identity?.sourceColumn,
        email: email?.sourceColumn,
        customFields,
      },
      parsedRowsPreview: validation.prepared.slice(0, 5).map((r) => ({
        phone: r.phone,
        name: r.name ?? undefined,
        email: r.email ?? undefined,
        customFields: r.attributes,
      })),
      preparedTargets: validation.prepared.map((r) => ({
        phone: r.phone,
        name: r.name,
        email: r.email,
        attributes: r.attributes,
      })),
      validCount: validation.validCount,
      invalidCount: validation.invalidCount,
      duplicateCount: validation.duplicateCount,
    });
  }

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

      const mappings = buildDefaultMappings(parsed.headers);
      applyMappings(parsed.rows, mappings, {
        fileName: file.name,
        rowCount: parsed.totalRows,
        csvHeaders: parsed.headers,
      });
      setError(null);
    };

    reader.readAsText(file);
  }

  function updateMapping(sourceColumn: string, role: AudienceFieldRole | "skip") {
    let next: ColumnMapping[] = draft.columnMappings.filter((m) => m.sourceColumn !== sourceColumn);

    if (role !== "skip") {
      // Only one dial / identity / email mapping at a time
      if (role === "dial" || role === "identity" || role === "contact_email") {
        next = next.map((m) => (m.role === role ? { ...m, role: "custom" as const } : m));
      }
      const key =
        role === "dial"
          ? "phone"
          : role === "identity"
            ? "name"
            : role === "contact_email"
              ? "email"
              : sourceColumn
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_+|_+$/g, "") || "field";
      next.push({ sourceColumn, key, role });
    }

    if (draft.parsedRows.length > 0) {
      applyMappings(draft.parsedRows, next);
    } else {
      onUpdate({ columnMappings: next });
    }
  }

  function roleForHeader(header: string): AudienceFieldRole | "skip" {
    return draft.columnMappings.find((m) => m.sourceColumn === header)?.role ?? "skip";
  }

  function handleContinue() {
    if (!draft.columnMappings.some((m) => m.role === "dial")) {
      setError("Map one CSV column to Dial (phone) before continuing.");
      return;
    }
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
          Step 2 &middot; Audience &amp; column mapping
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Upload any CSV. Map one column to dial (phone); every other header can become a custom
          attribute — there is no fixed company / name schema.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-8">
          {error}
        </div>
      )}

      <div className="border border-border-faint rounded-10 p-4 bg-neutral-50/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 text-heat-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-accent-black">
              {draft.fileName || "Upload a CSV"}
            </p>
            <p className="text-xs text-neutral-400">
              {draft.rowCount ? `${draft.rowCount} rows` : "Any headers welcome"} &middot; max 5MB
            </p>
          </div>
        </div>

        <label className="cursor-pointer px-3.5 py-1.5 rounded-6 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black shadow-xs transition-colors shrink-0">
          <span>{draft.fileName ? "Change file" : "Choose file"}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {headers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Map each column
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {headers.map((header) => (
                <div key={header} className="space-y-1">
                  <label className="text-neutral-700 font-mono text-[11px] block truncate">
                    {header}
                  </label>
                  <select
                    value={roleForHeader(header)}
                    onChange={(e) =>
                      updateMapping(header, e.target.value as AudienceFieldRole | "skip")
                    }
                    className="w-full px-2.5 py-1.5 border border-border-faint rounded-6 bg-white focus:outline-none focus:border-heat-100"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Preview
            </h4>
            <div className="border border-border-faint rounded-8 overflow-x-auto bg-white">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-border-faint bg-neutral-50/50 text-neutral-400 font-mono">
                    {(previewHeaders.length > 0 ? previewHeaders : ["phone"]).map((h) => (
                      <th key={h} className="p-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-faint text-neutral-700 font-mono">
                  {draft.parsedRowsPreview.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {(previewHeaders.length > 0 ? previewHeaders : ["phone"]).map((h) => {
                        const mapping = draft.columnMappings.find((m) => m.sourceColumn === h);
                        let value = "";
                        if (mapping?.role === "dial") value = row.phone;
                        else if (mapping?.role === "identity") value = row.name ?? "";
                        else if (mapping?.role === "contact_email") value = row.email ?? "";
                        else if (mapping) value = row.customFields?.[mapping.key] ?? "";
                        return (
                          <td key={h} className="p-2 truncate max-w-[100px]">
                            {value || "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {draft.parsedRowsPreview.length === 0 && (
                    <tr>
                      <td className="p-2 text-neutral-400" colSpan={4}>
                        Upload a file to preview rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {draft.rowCount ? (
        <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-8 flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">
            Dial column: {draft.mappedColumns.phone || "not mapped"} · {draft.validCount} valid ·{" "}
            {draft.invalidCount} invalid · {draft.duplicateCount} duplicates
          </span>
        </div>
      ) : (
        <p className="text-xs text-neutral-500">
          Choose a CSV. Map one column to Dial (phone) and review the parsed rows before continuing.
        </p>
      )}

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
