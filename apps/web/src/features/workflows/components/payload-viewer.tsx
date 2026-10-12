"use client";

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import type { StepRun } from "../lib/types";

interface PayloadViewerProps {
  step: StepRun;
}

export function PayloadViewer({ step }: PayloadViewerProps) {
  const [activeTab, setActiveTab] = useState<"inputs" | "output" | "error">(
    step.status === "failed" ? "inputs" : "inputs"
  );

  function sanitizeAndFormat(data: unknown): string {
    if (data === undefined || data === null) {
      return "";
    }
    try {
      // Defensive redaction of sensitive tokens if any slipped into the payload
      const str = JSON.stringify(data, (key, value) => {
        const lower = key.toLowerCase();
        if (
          lower.includes("secret") ||
          lower.includes("token") ||
          lower.includes("authorization") ||
          lower.includes("password") ||
          lower.includes("api_key")
        ) {
          return "[REDACTED]";
        }
        return value;
      }, 2);
      return str;
    } catch {
      return String(data);
    }
  }

  const inputsFormatted = sanitizeAndFormat(step.inputs);
  const outputFormatted = sanitizeAndFormat(step.output);
  const errorFormatted = step.error ? sanitizeAndFormat(step.error) : "";

  return (
    <div className="flex flex-col space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-faint text-xs pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("inputs")}
          className={`px-3 py-1 font-medium rounded-4 transition-colors ${
            activeTab === "inputs"
              ? "bg-neutral-100 text-accent-black font-semibold"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          Inputs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("output")}
          className={`px-3 py-1 font-medium rounded-4 transition-colors ${
            activeTab === "output"
              ? "bg-neutral-100 text-accent-black font-semibold"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          Output
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("error")}
          className={`px-3 py-1 font-medium rounded-4 transition-colors ${
            activeTab === "error"
              ? "bg-neutral-100 text-accent-black font-semibold"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          Error
        </button>
      </div>

      {/* Payload Display Box */}
      <div className="bg-neutral-50/70 border border-border-faint rounded-8 p-3 max-h-[220px] overflow-auto text-xs font-mono text-neutral-800">
        {activeTab === "inputs" && (
          inputsFormatted ? (
            <pre className="whitespace-pre font-mono leading-relaxed">{inputsFormatted}</pre>
          ) : (
            <span className="text-neutral-400 italic">No input recorded</span>
          )
        )}
        {activeTab === "output" && (
          outputFormatted ? (
            <pre className="whitespace-pre font-mono leading-relaxed">{outputFormatted}</pre>
          ) : (
            <span className="text-neutral-400 italic">No output recorded</span>
          )
        )}
        {activeTab === "error" && (
          errorFormatted ? (
            <pre className="whitespace-pre font-mono leading-relaxed text-red-700">{errorFormatted}</pre>
          ) : (
            <span className="text-neutral-400 italic">No error recorded</span>
          )
        )}
      </div>

      {/* Persistent Error Callout Banner if step has error (as seen in screenshot) */}
      {step.error && (
        <div className="rounded-8 border border-red-200 bg-red-50/70 p-3 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-red-900">
              {step.error.message || `Error status ${step.error.httpStatus}`}
            </p>
            {step.error.details && (
              <p className="text-red-700 text-[11px] leading-relaxed">
                {step.error.details}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
