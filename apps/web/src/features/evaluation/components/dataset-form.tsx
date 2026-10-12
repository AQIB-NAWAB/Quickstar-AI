"use client";

import { ArrowLeft,Database,Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EvaluationDataset } from "../lib/types";

interface DatasetFormProps {
  workspaceId: string;
  isPreview?: boolean;
  onSubmit: (data: { name: string; description?: string }) => Promise<EvaluationDataset | null>;
}

export function DatasetForm({
  workspaceId,
  isPreview = false,
  onSubmit,
}: DatasetFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePath = isPreview
    ? "/preview/eval"
    : `/workspaces/${workspaceId}/eval`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Dataset name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (created) {
        router.push(`${basePath}/datasets/${created.id}`);
      } else {
        router.push(`${basePath}/datasets`);
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || "Failed to create dataset.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#ededed] pb-4">
        <Link
          href={`${basePath}/datasets`}
          className="rounded-lg border border-[#ededed] p-1.5 text-[#737373] hover:text-[#262626] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#262626]">
            Create evaluation dataset
          </h1>
          <p className="text-xs text-[#737373] mt-0.5">
            Create a benchmark dataset to evaluate agent versions against expected outputs and tools.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#ededed] bg-white p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#262626]">
              Dataset name <span className="text-[#fa5d19]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Support basics, Checkout flow tests"
              className="w-full rounded-lg border border-[#ededed] bg-white px-3 py-2 text-xs text-[#262626] focus:border-[#fa5d19] focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#262626]">
              Description (optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What domain, edge cases, or capabilities does this dataset test?"
              className="w-full rounded-lg border border-[#ededed] bg-white px-3 py-2 text-xs text-[#262626] focus:border-[#fa5d19] focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 text-xs text-[#737373] space-y-1">
            <div className="font-semibold text-[#262626] flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-[#fa5d19]" />
              Dataset versioning
            </div>
            <p className="text-[11px] text-[#737373]">
              Datasets are created at revision 1. Adding, editing, or importing test cases produces incremental revision snapshots so historical evaluations remain reproducible.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ededed]">
            <Link
              href={`${basePath}/datasets`}
              className="rounded-lg border border-[#ededed] bg-white px-4 py-2 text-xs font-medium text-[#737373] hover:text-[#262626] transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-[#fa5d19] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Creating..." : "Create dataset"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
