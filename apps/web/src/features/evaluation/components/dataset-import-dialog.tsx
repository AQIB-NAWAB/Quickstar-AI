"use client";

import { Check,X } from "lucide-react";
import { useState } from "react";
import { parseEvaluationCasesCsv,type CsvParseResult } from "../lib/csv";
import type { EvaluationCase } from "../lib/types";

interface DatasetImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  onImportSuccess: (cases: Partial<EvaluationCase>[]) => void;
}

export function DatasetImportDialog({
  isOpen,
  onClose,
  datasetId,
  onImportSuccess,
}: DatasetImportDialogProps) {
  const [fileName, setFileName] = useState("support-basics.csv");
  const [inputCol, setInputCol] = useState("input");
  const [outputCol, setOutputCol] = useState("expected_output");
  const [toolsCol, setToolsCol] = useState("expected_tools");
  const [csvContent, setCsvContent] = useState<string>(
    `input,expected_output,expected_tools,case_name\n"Can I return an item after 45 days?","Returns are accepted within 30 days.","[""get_return_policy""]","Return policy boundary"\n"Where is order #1042?","Looking up order #1042 for you.","[""order_lookup""]","Order lookup"`
  );
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
        const res = parseEvaluationCasesCsv(text, datasetId, {
          input: inputCol,
          expectedOutput: outputCol,
          expectedTools: toolsCol,
        });
        setParseResult(res);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = () => {
    const res =
      parseResult ||
      parseEvaluationCasesCsv(csvContent, datasetId, {
        input: inputCol,
        expectedOutput: outputCol,
        expectedTools: toolsCol,
      });

    if (res.validCases.length > 0) {
      onImportSuccess(res.validCases);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-label="Import from CSV" className="w-full max-w-lg rounded-xl border border-[#ededed] bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#262626]">
            Import from CSV
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#a3a3a3] hover:text-[#262626] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* File Picker */}
          <div className="flex items-center justify-between rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#737373]">File</span>
              <span className="font-mono font-medium text-[#262626]">
                {fileName}
              </span>
            </div>
            <label className="cursor-pointer rounded-md border border-[#ededed] bg-white px-2.5 py-1 text-[11px] font-medium text-[#737373] hover:text-[#262626] transition-colors">
              Change file
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* Column Mapping */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Column mapping
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-[#737373]">Input column</label>
                <select
                  value={inputCol}
                  onChange={(e) => setInputCol(e.target.value)}
                  className="rounded-lg border border-[#ededed] bg-white px-3 py-1.5 font-mono text-xs text-[#262626] focus:border-[#fa5d19] focus:outline-none"
                >
                  <option value="input">input</option>
                  <option value="prompt">prompt</option>
                  <option value="query">query</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="text-[#737373]">Expected output column</label>
                <select
                  value={outputCol}
                  onChange={(e) => setOutputCol(e.target.value)}
                  className="rounded-lg border border-[#ededed] bg-white px-3 py-1.5 font-mono text-xs text-[#262626] focus:border-[#fa5d19] focus:outline-none"
                >
                  <option value="expected_output">expected_output</option>
                  <option value="output">output</option>
                  <option value="answer">answer</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="text-[#737373]">Expected tools column</label>
                <select
                  value={toolsCol}
                  onChange={(e) => setToolsCol(e.target.value)}
                  className="rounded-lg border border-[#ededed] bg-white px-3 py-1.5 font-mono text-xs text-[#262626] focus:border-[#fa5d19] focus:outline-none"
                >
                  <option value="expected_tools">expected_tools</option>
                  <option value="tools">tools</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 text-xs text-[#737373] space-y-1">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-green-600" />
              <span>10 valid cases · Sample file</span>
            </div>
            <p className="text-[11px] text-[#a3a3a3]">
              CSV values for expected_tools must be formatted as a JSON array of strings e.g. [&quot;get_return_policy&quot;].
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#ededed] bg-white px-4 py-2 text-xs font-medium text-[#737373] hover:text-[#262626] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-lg bg-[#fa5d19] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors"
            >
              Save cases
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
