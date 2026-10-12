"use client";

import { ArrowLeft,Edit2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { WorkflowDefinition } from "../lib/types";
import { WorkflowStatusBadge } from "./workflow-status-badge";

interface WorkflowHeaderProps {
  workflow: WorkflowDefinition;
  isNew?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  isPreview?: boolean;
  activeTab: "builder" | "runs";
  backUrl: string;
  runsUrl: string;
  builderUrl: string;
  onSaveDraft: () => void;
  onToggleActive?: () => void;
  onUpdateMetadata: (name: string, description: string | null) => void;
}

export function WorkflowHeader({
  workflow,
  isNew = false,
  isDirty = false,
  isSaving = false,
  isPreview = false,
  activeTab,
  backUrl,
  runsUrl,
  builderUrl,
  onSaveDraft,
  onToggleActive,
  onUpdateMetadata,
}: WorkflowHeaderProps) {
  const [isEditingMeta, setIsEditingMeta] = useState(isNew);
  const [nameInput, setNameInput] = useState(workflow.name);
  const [descInput, setDescInput] = useState(workflow.description || "");

  function handleSaveMeta() {
    onUpdateMetadata(nameInput.trim() || "Untitled workflow", descInput.trim() || null);
    setIsEditingMeta(false);
  }

  function handleCancelMeta() {
    setNameInput(workflow.name);
    setDescInput(workflow.description || "");
    setIsEditingMeta(false);
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-[#e04e10] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All workflows</span>
        </Link>
      </div>

      {/* Main Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          {isEditingMeta ? (
            <div className="space-y-2 max-w-md">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Workflow name"
                className="w-full text-lg font-bold text-accent-black px-2.5 py-1 border border-border-faint rounded-6 focus:border-heat-100 focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="Brief description (optional)"
                className="w-full text-xs text-neutral-600 px-2.5 py-1 border border-border-faint rounded-6 focus:border-heat-100 focus:outline-none"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveMeta}
                  className="px-2.5 py-1 text-xs font-semibold bg-heat-100 text-white rounded-4 hover:bg-[#e04e10]"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={handleCancelMeta}
                  className="px-2.5 py-1 text-xs font-medium text-neutral-600 rounded-4 hover:bg-neutral-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-accent-black tracking-tight">
                  {workflow.name}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingMeta(true)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100"
                  title="Edit workflow name & description"
                  aria-label="Edit title"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <WorkflowStatusBadge status={workflow.status} />
                {isPreview && (
                  <span className="border border-orange-200 bg-orange-50/50 text-heat-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Sample data
                  </span>
                )}
              </div>
              {workflow.description && (
                <p className="text-xs text-neutral-500 leading-normal">
                  {workflow.description}
                </p>
              )}
            </>
          )}
        </div>

        {/* Action Buttons & Dirty Indicator */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-6 text-xs font-semibold border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 shadow-xs disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              onClick={onToggleActive}
              disabled={isPreview || isSaving || !onToggleActive}
              title={
                isPreview
                  ? "Activation is disabled in preview mode."
                  : workflow.status === "active"
                    ? "Pause this workflow"
                    : "Activate this workflow"
              }
              className={`px-4 py-1.5 rounded-6 text-xs font-semibold shadow-xs transition-colors ${
                workflow.status === "active"
                  ? "border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50"
                  : "bg-heat-100 text-white hover:bg-[#e04e10] disabled:opacity-50"
              }`}
            >
              {workflow.status === "active" ? "Pause" : "Activate"}
            </button>
          </div>
          {(isDirty || workflow.status === "draft") && (
            <span className="text-[11px] text-neutral-400">
              Changes are not published.
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border-faint text-xs">
        <Link
          href={builderUrl}
          className={`pb-2.5 -mb-px transition-colors ${
            activeTab === "builder"
              ? "border-b-2 border-heat-100 font-bold text-accent-black"
              : "text-neutral-500 hover:text-neutral-900 font-medium"
          }`}
        >
          Builder
        </Link>
        <Link
          href={runsUrl}
          className={`pb-2.5 -mb-px transition-colors ${
            activeTab === "runs"
              ? "border-b-2 border-heat-100 font-bold text-accent-black"
              : "text-neutral-500 hover:text-neutral-900 font-medium"
          }`}
        >
          Execution history
        </Link>
      </div>
    </div>
  );
}
