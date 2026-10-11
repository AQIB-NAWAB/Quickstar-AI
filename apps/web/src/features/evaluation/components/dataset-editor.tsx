"use client";

import { ArrowLeft,Check,Plus,Save,Upload,X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { EvaluationCase,EvaluationDataset } from "../lib/types";
import { DatasetImportDialog } from "./dataset-import-dialog";

interface DatasetEditorProps {
  workspaceId: string;
  dataset: EvaluationDataset;
  initialCases: EvaluationCase[];
  isPreview?: boolean;
}

export function DatasetEditor({
  workspaceId,
  dataset,
  initialCases,
  isPreview = false,
}: DatasetEditorProps) {
  const [cases, setCases] = useState<EvaluationCase[]>(initialCases);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    initialCases[3]?.id || initialCases[0]?.id || null // defaults to Case 4 if present
  );
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Form states for the currently selected or new case
  const activeCase = cases.find((c) => c.id === selectedCaseId);
  const [caseName, setCaseName] = useState(activeCase?.name || "Return policy boundary");
  const [input, setInput] = useState(
    activeCase?.input || "Can I return an item after 45 days?"
  );
  const [expectedOutput, setExpectedOutput] = useState(
    activeCase?.expectedOutput || "Returns are accepted within 30 days."
  );
  const [tools, setTools] = useState<string[]>(
    activeCase?.expectedTools || ["get_return_policy"]
  );
  const [newToolInput, setNewToolInput] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const basePath = isPreview
    ? "/preview/eval"
    : `/workspaces/${workspaceId}/eval`;

  const handleSelectCase = (c: EvaluationCase) => {
    setSelectedCaseId(c.id);
    setCaseName(c.name);
    setInput(c.input);
    setExpectedOutput(c.expectedOutput);
    setTools(c.expectedTools);
    setIsSaved(false);
  };

  const handleAddNewCase = () => {
    setSelectedCaseId(null);
    setCaseName(`Test case ${cases.length + 1}`);
    setInput("");
    setExpectedOutput("");
    setTools([]);
    setIsSaved(false);
  };

  const handleAddTool = () => {
    if (newToolInput.trim() && !tools.includes(newToolInput.trim())) {
      setTools([...tools, newToolInput.trim()]);
      setNewToolInput("");
    }
  };

  const handleRemoveTool = (toolToRemove: string) => {
    setTools(tools.filter((t) => t !== toolToRemove));
  };

  const handleSaveCase = () => {
    if (selectedCaseId) {
      setCases(
        cases.map((c) =>
          c.id === selectedCaseId
            ? { ...c, name: caseName, input, expectedOutput, expectedTools: tools }
            : c
        )
      );
    } else {
      const newCase: EvaluationCase = {
        id: `case_${Date.now()}`,
        datasetId: dataset.id,
        name: caseName,
        input,
        expectedOutput,
        expectedTools: tools,
        createdAt: new Date().toISOString(),
      };
      setCases([...cases, newCase]);
      setSelectedCaseId(newCase.id);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleImportSuccess = (imported: Partial<EvaluationCase>[]) => {
    const formatted: EvaluationCase[] = imported.map((c, i) => ({
      id: `case_imp_${Date.now()}_${i}`,
      datasetId: dataset.id,
      name: c.name || `Imported Case ${cases.length + i + 1}`,
      input: c.input || "",
      expectedOutput: c.expectedOutput || "",
      expectedTools: c.expectedTools || [],
      createdAt: new Date().toISOString(),
    }));
    setCases([...cases, ...formatted]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#ededed] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`${basePath}/datasets`}
            className="rounded-lg border border-[#ededed] p-1.5 text-[#737373] hover:text-[#262626] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#262626]">
                Dataset editor · {dataset.name}
              </h1>
              <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-[#737373]">
                rev {dataset.revision}
              </span>
            </div>
            <p className="font-mono text-xs text-[#a3a3a3] mt-0.5">
              /eval/datasets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#ededed] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:bg-[#f9f9f9] transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-[#737373]" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={handleAddNewCase}
            className="flex items-center gap-1.5 rounded-lg bg-[#fa5d19] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add test case</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Test Cases List */}
        <div className="lg:col-span-5 rounded-xl border border-[#ededed] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Test cases ({cases.length})
            </h2>
          </div>

          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {cases.map((c, index) => {
              const isSelected = c.id === selectedCaseId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCase(c)}
                  className={`w-full text-left rounded-lg p-3 text-xs transition-colors border ${
                    isSelected
                      ? "border-[#fa5d19] bg-[#fa5d19]/5"
                      : "border-transparent bg-[#f9f9f9] hover:bg-neutral-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#262626]">
                      {index + 1}. {c.name}
                    </span>
                    {c.expectedTools.length > 0 && (
                      <span className="font-mono text-[10px] text-[#fa5d19]">
                        {c.expectedTools.length} tool{c.expectedTools.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-1 text-[#737373] mt-1 text-[11px]">
                    {c.input}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Case Editor Form */}
        <div className="lg:col-span-7 rounded-xl border border-[#ededed] bg-white p-6 space-y-4">
          <div className="border-b border-[#ededed] pb-3">
            <h2 className="text-base font-bold text-[#262626]">
              {selectedCaseId ? "Edit test case" : "New test case"}
            </h2>
          </div>

          <div className="space-y-4">
            {/* Case Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#737373]">
                Case name
              </label>
              <input
                type="text"
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                placeholder="e.g. Return policy boundary"
                className="w-full rounded-lg border border-[#ededed] bg-white px-3 py-2 text-xs font-medium text-[#262626] focus:border-[#fa5d19] focus:outline-none"
              />
            </div>

            {/* Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#737373]">
                Input
              </label>
              <textarea
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Customer inquiry prompt..."
                className="w-full rounded-lg border border-[#ededed] bg-white px-3 py-2 text-xs text-[#262626] focus:border-[#fa5d19] focus:outline-none"
              />
            </div>

            {/* Expected Output */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#737373]">
                Expected output
              </label>
              <textarea
                rows={3}
                value={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.value)}
                placeholder="Expected assistant response..."
                className="w-full rounded-lg border border-[#ededed] bg-white px-3 py-2 text-xs text-[#262626] focus:border-[#fa5d19] focus:outline-none"
              />
            </div>

            {/* Expected Tools */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#737373]">
                Expected tools
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {tools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1 rounded bg-[#fa5d19]/10 px-2 py-1 font-mono text-[11px] font-medium text-[#fa5d19]"
                  >
                    <span>{tool}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTool(tool)}
                      className="hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newToolInput}
                  onChange={(e) => setNewToolInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTool();
                    }
                  }}
                  placeholder="Add tool requirement (e.g. get_return_policy)"
                  className="rounded-lg border border-[#ededed] bg-[#f9f9f9] px-3 py-1.5 font-mono text-xs text-[#262626] focus:border-[#fa5d19] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTool}
                  className="rounded-lg border border-[#ededed] bg-white px-2.5 py-1.5 text-xs font-medium text-[#737373] hover:text-[#262626]"
                >
                  Add tool
                </button>
              </div>

              <p className="text-[11px] text-[#a3a3a3]">
                Expected outputs and tools define the case criteria.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ededed]">
              <button
                type="button"
                onClick={() => {
                  if (activeCase) {
                    setCaseName(activeCase.name);
                    setInput(activeCase.input);
                    setExpectedOutput(activeCase.expectedOutput);
                    setTools(activeCase.expectedTools);
                  }
                }}
                className="rounded-lg border border-[#ededed] bg-white px-4 py-2 text-xs font-medium text-[#737373] hover:text-[#262626] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCase}
                className="flex items-center gap-1.5 rounded-lg bg-[#fa5d19] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors"
              >
                {isSaved ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save case</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Import Dialog */}
      <DatasetImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        datasetId={dataset.id}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
