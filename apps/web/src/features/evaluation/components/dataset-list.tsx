"use client";

import { Database,Plus,Search,Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { EvaluationDataset } from "../lib/types";
import { DatasetImportDialog } from "./dataset-import-dialog";

interface DatasetListProps {
  workspaceId: string;
  datasets: EvaluationDataset[];
  isPreview?: boolean;
  isCompact?: boolean; // For overview page card embedding
  onDatasetCreated?: (dataset: EvaluationDataset) => void;
}

export function DatasetList({
  workspaceId,
  datasets,
  isPreview = false,
  isCompact = false,
}: DatasetListProps) {
  const [search, setSearch] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const basePath = isPreview
    ? "/preview/eval"
    : `/workspaces/${workspaceId}/eval`;

  const filteredDatasets = datasets.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return isoString;
    }
  };

  if (isCompact) {
    return (
      <div className="rounded-xl border border-[#ededed] bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#262626]">
            Evaluation datasets
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="rounded-lg border border-[#ededed] bg-white px-2.5 py-1 text-xs font-medium text-[#262626] hover:bg-[#f9f9f9] transition-colors"
            >
              Import CSV
            </button>
            <Link
              href={`${basePath}/datasets/new`}
              className="flex items-center gap-1 rounded-lg border border-[#fa5d19] bg-white px-2.5 py-1 text-xs font-medium text-[#fa5d19] hover:bg-[#fa5d19]/5 transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>Create dataset</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#ededed] text-[11px] font-semibold text-[#737373]">
                <th className="pb-2 font-medium">Dataset</th>
                <th className="pb-2 font-medium">Cases</th>
                <th className="pb-2 font-medium">Revision</th>
                <th className="pb-2 font-medium">Updated</th>
                <th className="pb-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ededed]">
              {datasets.map((d) => (
                <tr key={d.id} className="group hover:bg-[#f9f9f9]/50">
                  <td className="py-2.5 font-medium text-[#262626]">
                    <Link
                      href={`${basePath}/datasets/${d.id}`}
                      className="hover:text-[#fa5d19] transition-colors"
                    >
                      {d.name}
                    </Link>
                  </td>
                  <td className="py-2.5 font-mono text-[#737373]">
                    {d.caseCount}
                  </td>
                  <td className="py-2.5 font-mono text-[#737373]">
                    {d.revision}
                  </td>
                  <td className="py-2.5 text-[#a3a3a3]">
                    {formatDate(d.updatedAt)}
                  </td>
                  <td className="py-2.5 text-right">
                    <Link
                      href={`${basePath}/datasets/${d.id}`}
                      className="text-xs font-medium text-[#fa5d19] hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[#a3a3a3] pt-1 border-t border-[#ededed]/60">
          Runs use a fixed snapshot of the selected dataset.
        </p>

        <DatasetImportDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          datasetId={datasets[0]?.id || "support-basics"}
          onImportSuccess={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#ededed] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#262626]">
              Evaluation datasets
            </h1>
            {isPreview && (
              <span className="rounded bg-[#fa5d19]/10 px-2 py-0.5 text-[11px] font-medium text-[#fa5d19]">
                Sample data
              </span>
            )}
          </div>
          <p className="text-xs text-[#737373] mt-1">
            Manage test datasets, test cases, and CSV benchmarks for agent evaluation.
          </p>
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
          <Link
            href={`${basePath}/datasets/new`}
            className="flex items-center gap-1.5 rounded-lg bg-[#fa5d19] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create dataset</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a3a3a3]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search datasets..."
            className="w-full rounded-lg border border-[#ededed] bg-white pl-9 pr-3 py-1.5 text-xs text-[#262626] focus:border-[#fa5d19] focus:outline-none"
          />
        </div>
      </div>

      {/* Datasets Table */}
      <div className="rounded-xl border border-[#ededed] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f9f9f9] border-b border-[#ededed]">
              <tr className="text-[11px] font-semibold text-[#737373]">
                <th className="px-5 py-3 font-medium">Dataset</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Cases</th>
                <th className="px-5 py-3 font-medium">Revision</th>
                <th className="px-5 py-3 font-medium">Updated UTC</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ededed]">
              {filteredDatasets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-xs text-[#a3a3a3]"
                  >
                    No evaluation datasets found.
                  </td>
                </tr>
              ) : (
                filteredDatasets.map((d) => (
                  <tr
                    key={d.id}
                    className="group hover:bg-[#f9f9f9]/50 transition-colors"
                  >
                    <td className="px-5 py-2.5 font-medium text-[#262626]">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-[#737373]" />
                        <Link
                          href={`${basePath}/datasets/${d.id}`}
                          className="hover:text-[#fa5d19] transition-colors font-semibold"
                        >
                          {d.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-[#737373] max-w-xs truncate">
                      {d.description || "—"}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[#262626]">
                      {d.caseCount}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[#737373]">
                      rev {d.revision}
                    </td>
                    <td className="px-5 py-2.5 text-[#a3a3a3] font-mono text-[11px]">
                      {formatDate(d.updatedAt)}
                    </td>
                    <td className="px-5 py-2.5 text-right space-x-3">
                      <Link
                        href={`${basePath}/datasets/${d.id}`}
                        className="font-medium text-[#fa5d19] hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DatasetImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        datasetId={datasets[0]?.id || "support-basics"}
        onImportSuccess={() => {}}
      />
    </div>
  );
}
