"use client";

import { Play,X } from "lucide-react";
import { useState } from "react";
import type { EvaluationDataset } from "../lib/types";

interface StartEvaluationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: EvaluationDataset[];
  onStart: (data: { versionId: string; datasetId: string }) => void;
}

export function StartEvaluationDialog({
  isOpen,
  onClose,
  datasets,
  onStart,
}: StartEvaluationDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState("ver_v8");
  const [selectedDatasetId, setSelectedDatasetId] = useState(
    datasets[0]?.id || "support-basics"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const activeDataset =
    datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onStart({
        versionId: selectedVersion,
        datasetId: selectedDatasetId,
      });
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-label="Run evaluation" className="w-full max-w-lg rounded-xl border border-[#ededed] bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#262626]">
              Run evaluation
            </h2>
            <p className="font-mono text-[11px] text-[#a3a3a3]">
              /agents/[agentId]/eval
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#a3a3a3] hover:text-[#262626] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Published Version */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#737373]">
                Select published version
              </label>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="w-full rounded-lg border border-[#ededed] bg-white px-3 py-2 text-xs font-medium text-[#262626] focus:border-[#fa5d19] focus:outline-none"
              >
                <option value="ver_v8">v8 · Published</option>
                <option value="ver_v7">v7</option>
                <option value="ver_v6">v6</option>
              </select>
            </div>

            {/* Dataset */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#737373]">
                Dataset
              </label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full rounded-lg border border-[#ededed] bg-white px-3 py-2 text-xs font-medium text-[#262626] focus:border-[#fa5d19] focus:outline-none"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · revision {d.revision}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Snapshot Summary Box */}
          <div className="rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 text-xs text-[#737373] space-y-1">
            <div className="font-medium text-[#262626]">
              {activeDataset ? `${activeDataset.caseCount} cases` : "10 cases"} ·
              Scoring policy: support-v1
            </div>
            <p className="text-[11px] text-[#a3a3a3]">
              Run results remain tied to this version and dataset snapshot.
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
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-[#fa5d19] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors disabled:opacity-50"
            >
              <Play className="h-3 w-3 fill-white" />
              <span>{isSubmitting ? "Starting..." : "Start evaluation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
