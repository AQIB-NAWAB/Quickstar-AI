"use client";

import { AlertCircle, CheckCircle2, FileSpreadsheet, Table, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { EvaluationApiClient } from "../lib/api-repository";
import { parseCsvRowsToObjects, parseEvaluationCasesJson } from "../lib/csv";
import type { EvaluationCase } from "../lib/types";

interface DatasetImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  datasetId: string;
  onImportSuccess?: (count: number, newRevision: number) => void;
}

export function DatasetImportDialog({
  isOpen,
  onClose,
  workspaceId,
  datasetId,
  onImportSuccess,
}: DatasetImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [fileType, setFileType] = useState<"csv" | "json">("csv");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [inputCol, setInputCol] = useState<string>("");
  const [outputCol, setOutputCol] = useState<string>("");
  const [nameCol, setNameCol] = useState<string>("");
  const [toolsCol, setToolsCol] = useState<string>("");
  const [tagsCol, setTagsCol] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const autoDetectColumns = useCallback((detectedHeaders: string[]) => {
    const findMatch = (patterns: string[]) => {
      for (const p of patterns) {
        const found = detectedHeaders.find(
          (h) => h.toLowerCase().trim() === p || h.toLowerCase().trim().includes(p),
        );
        if (found) return found;
      }
      return "";
    };

    setInputCol(findMatch(["input", "query", "prompt", "user_message", "message", "question"]));
    setOutputCol(findMatch(["expected_output", "expected", "output", "response", "reply", "answer", "ground_truth"]));
    setNameCol(findMatch(["name", "case_name", "title", "id"]));
    setToolsCol(findMatch(["expected_tools", "tools", "tool_calls"]));
    setTagsCol(findMatch(["tags", "category", "labels", "tag"]));
  }, []);

  const handleFileProcess = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    const isJson = selectedFile.name.endsWith(".json");
    setFileType(isJson ? "json" : "csv");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);

      if (isJson) {
        const parsed = parseEvaluationCasesJson(text, datasetId);
        if (parsed.errors.length > 0 && parsed.validCases.length === 0) {
          setError(parsed.errors.join("; "));
        } else {
          setHeaders(["name", "input", "expectedOutput", "tags"]);
          setRows(
            parsed.validCases.map((c) => ({
              name: c.name ?? "",
              input: c.input ?? "",
              expectedOutput: c.expectedOutput ?? "",
              tags: Array.isArray(c.tags) ? c.tags.join(", ") : "",
            })),
          );
        }
      } else {
        const { headers: detectedHeaders, rows: parsedRows } = parseCsvRowsToObjects(text);
        setHeaders(detectedHeaders);
        setRows(parsedRows);
        autoDetectColumns(detectedHeaders);
      }
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsText(selectedFile);
  }, [datasetId, autoDetectColumns]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  if (!isOpen) return null;

  // Build mapped preview rows
  const mappedPreview = rows.slice(0, 3).map((r, i) => ({
    name: nameCol ? r[nameCol] : `Case ${i + 1}`,
    input: inputCol ? r[inputCol] : "",
    expectedOutput: outputCol ? r[outputCol] : "",
    tags: tagsCol && r[tagsCol] ? r[tagsCol].split(",").map((t) => t.trim()) : [],
  }));

  const handleImportSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let casesToImport: Partial<EvaluationCase>[] = [];

      if (fileType === "json") {
        const jsonResult = parseEvaluationCasesJson(rawText, datasetId);
        if (jsonResult.validCases.length === 0) {
          setError("No valid test cases found in JSON file.");
          setIsSubmitting(false);
          return;
        }
        casesToImport = jsonResult.validCases;
      } else {
        if (!inputCol) {
          setError("Please select a column to map to User Input Query.");
          setIsSubmitting(false);
          return;
        }

        casesToImport = rows
          .map((r, idx) => {
            const input = (r[inputCol] || "").trim();
            if (!input) return null;

            const name = nameCol && r[nameCol] ? r[nameCol].trim() : `Imported Case #${idx + 1}`;
            const expectedOutput = outputCol && r[outputCol] ? r[outputCol].trim() : "";
            const tags = tagsCol && r[tagsCol]
              ? r[tagsCol].split(",").map((t) => t.trim()).filter(Boolean)
              : [];

            let expectedTools: any[] = [];
            if (toolsCol && r[toolsCol]) {
              try {
                const parsed = JSON.parse(r[toolsCol]);
                expectedTools = Array.isArray(parsed)
                  ? parsed.map((item) => (typeof item === "string" ? { name: item } : item))
                  : [{ name: String(parsed) }];
              } catch {
                expectedTools = r[toolsCol].split(",").map((t) => ({ name: t.trim() }));
              }
            }

            return {
              name,
              input,
              expectedOutput,
              expectedTools,
              tags,
            };
          })
          .filter(Boolean) as Partial<EvaluationCase>[];
      }

      if (casesToImport.length === 0) {
        setError("Zero valid cases were found to import from this file.");
        setIsSubmitting(false);
        return;
      }

      const res = await EvaluationApiClient.importCases(
        workspaceId,
        datasetId,
        casesToImport as any,
      );

      if (!res.ok) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      if (onImportSuccess) {
        onImportSuccess(res.data.imported_count, res.data.new_revision);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import cases");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import test cases dialog"
        className="w-full max-w-2xl rounded-2xl border border-[#EAECF0] bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EAECF0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF571A]/10 text-[#FF571A]">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-[#18181B]">
                Import Test Cases
              </h2>
            </div>
            <p className="text-xs text-[#71717A] mt-1">
              Upload a CSV or JSON file and map columns to benchmark test cases.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-[#71717A] hover:bg-[#F8F9FB] hover:text-[#18181B] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-[#FEF3F2] border border-[#FEE4E2] p-3 text-xs text-[#B42318]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Dropzone */}
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging
                ? "border-[#FF571A] bg-[#FF571A]/5"
                : "border-[#DCE1E8] bg-[#F8F9FB] hover:border-[#FF571A]"
            }`}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white border border-[#EAECF0] text-[#FF571A] mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-[#18181B]">
              Drag and drop your test dataset file here, or{" "}
              <label className="text-[#FF571A] hover:underline cursor-pointer">
                browse files
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
                  }}
                />
              </label>
            </p>
            <p className="text-[11px] text-[#71717A] mt-1">
              Supports CSV (RFC 4180 standard) and JSON formats. Max 10MB.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info Strip */}
            <div className="flex items-center justify-between rounded-xl border border-[#EAECF0] bg-[#F8F9FB] p-3 text-xs">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-4 w-4 text-[#FF571A]" />
                <span className="font-semibold text-[#18181B]">{file.name}</span>
                <span className="text-[11px] font-mono text-[#71717A]">
                  ({(file.size / 1024).toFixed(1)} KB · {rows.length || "JSON"} rows detected)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setRows([]);
                  setHeaders([]);
                }}
                className="text-[11px] font-semibold text-[#FF571A] hover:underline"
              >
                Change file
              </button>
            </div>

            {/* Column Mapping (For CSV) */}
            {fileType === "csv" && headers.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-[#18181B] flex items-center gap-1.5">
                  <Table className="h-3.5 w-3.5 text-[#71717A]" />
                  <span>Map File Columns</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8F9FB] p-3.5 rounded-xl border border-[#EAECF0]">
                  {/* User Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#18181B] flex items-center justify-between">
                      <span>User Query / Input</span>
                      <span className="text-[10px] text-[#FF571A] font-normal">Required</span>
                    </label>
                    <select
                      value={inputCol}
                      onChange={(e) => setInputCol(e.target.value)}
                      className="w-full rounded-lg border border-[#DCE1E8] bg-white px-2.5 py-1.5 text-xs text-[#18181B] focus:border-[#FF571A] focus:outline-none"
                    >
                      <option value="">-- Select column --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expected Output */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#18181B] flex items-center justify-between">
                      <span>Expected Output</span>
                      <span className="text-[10px] text-[#71717A] font-normal">Recommended</span>
                    </label>
                    <select
                      value={outputCol}
                      onChange={(e) => setOutputCol(e.target.value)}
                      className="w-full rounded-lg border border-[#DCE1E8] bg-white px-2.5 py-1.5 text-xs text-[#18181B] focus:border-[#FF571A] focus:outline-none"
                    >
                      <option value="">-- None (optional) --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Case Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#18181B]">
                      Test Case Name / ID
                    </label>
                    <select
                      value={nameCol}
                      onChange={(e) => setNameCol(e.target.value)}
                      className="w-full rounded-lg border border-[#DCE1E8] bg-white px-2.5 py-1.5 text-xs text-[#18181B] focus:border-[#FF571A] focus:outline-none"
                    >
                      <option value="">-- Auto-generate --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expected Tools */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#18181B]">
                      Expected Tools
                    </label>
                    <select
                      value={toolsCol}
                      onChange={(e) => setToolsCol(e.target.value)}
                      className="w-full rounded-lg border border-[#DCE1E8] bg-white px-2.5 py-1.5 text-xs text-[#18181B] focus:border-[#FF571A] focus:outline-none"
                    >
                      <option value="">-- None --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preview Table */}
                {mappedPreview.length > 0 && inputCol && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-[#71717A]">
                      Preview (First 3 Mapped Cases)
                    </div>
                    <div className="rounded-xl border border-[#EAECF0] bg-white overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-[#F8F9FB] border-b border-[#EAECF0] text-[11px] text-[#71717A]">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Name</th>
                            <th className="px-3 py-2 font-semibold">User Query Input</th>
                            <th className="px-3 py-2 font-semibold">Expected Response</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAECF0]">
                          {mappedPreview.map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#F8F9FB]/50">
                              <td className="px-3 py-2 font-medium text-[#18181B] max-w-[120px] truncate">
                                {item.name}
                              </td>
                              <td className="px-3 py-2 text-[#71717A] max-w-xs truncate font-mono text-[11px]">
                                {item.input || "—"}
                              </td>
                              <td className="px-3 py-2 text-[#71717A] max-w-xs truncate">
                                {item.expectedOutput || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#EAECF0] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#EAECF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#18181B] hover:bg-[#F8F9FB] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!file || (fileType === "csv" && !inputCol) || isSubmitting}
            onClick={handleImportSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-[#FF571A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#E0460D] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Importing Cases...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  Import {rows.length > 0 ? `${rows.length} Cases` : "Test Cases"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
