"use client";

import Link from "next/link";
import { ArrowLeft, Play, Upload } from "lucide-react";
import type { Agent } from "../lib/types";

type Props = {
  workspaceId: string;
  agent: Agent;
  releaseNumber?: number;
  isDirty: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError?: string | null;
  onSave: () => void;
  onPublish?: () => void;
  onOpenPublish?: () => void;
  onToggleTest?: () => void;
  onOpenTestDrawer?: () => void;
  isTestDrawerOpen?: boolean;
  showTestButton?: boolean;
};

export function EditorHeader({
  workspaceId,
  agent,
  releaseNumber,
  isDirty,
  isSaving,
  saveSuccess,
  saveError = null,
  onSave,
  onPublish,
  onOpenPublish,
  onToggleTest,
  onOpenTestDrawer,
  isTestDrawerOpen = false,
  showTestButton = true,
}: Props) {
  const handlePublish = onPublish || onOpenPublish || (() => {});
  const handleTest = onToggleTest || onOpenTestDrawer;
  const isLive = Boolean(agent.production_version_id);

  let statusText = "All changes saved.";
  let statusColor = "text-[#667085]";

  if (saveError) {
    statusText = `Save failed: ${saveError}`;
    statusColor = "text-[#B42318]";
  } else if (isSaving) {
    statusText = "Saving changes...";
    statusColor = "text-[#667085]";
  } else if (isDirty) {
    statusText = "Unsaved changes.";
    statusColor = "text-[#B54708]";
  } else if (saveSuccess) {
    statusText = "All changes saved.";
    statusColor = "text-[#15803D]";
  }

  return (
    <div className="pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Back button, Name, Badges */}
        <div className="flex items-start gap-3.5 min-w-0">
          <Link
            href={`/workspaces/${workspaceId}/agents`}
            aria-label="Back to agents"
            className="p-1.5 mt-0.5 text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] rounded-md transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0">
            <h1 className="text-[24px] sm:text-[32px] font-semibold text-[#202125] tracking-tight truncate leading-tight">
              {agent.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[13px]">
              <span className="font-mono text-[#475467] bg-[#F2F4F7] px-2 py-0.5 rounded border border-[#E1E5EA]">
                Draft v{agent.version}
              </span>

              <span className="text-[#CCD2D8]">•</span>

              {isLive ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[#475467]">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
                  {releaseNumber ? `Release #${releaseNumber} is live` : "Release is live"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[#667085] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#98A2B3]" aria-hidden="true" />
                  Unpublished
                </span>
              )}
            </div>

            <p className={`mt-1 text-[13px] ${statusColor} transition-colors`}>{statusText}</p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {showTestButton && handleTest && (
            <button
              type="button"
              onClick={handleTest}
              className={`inline-flex items-center gap-1.5 h-11 px-4 text-[14px] font-medium rounded-[6px] border border-[#E1E5EA] transition-colors shadow-sm ${
                isTestDrawerOpen
                  ? "bg-[#202125] text-white border-[#202125]"
                  : "bg-white text-[#202125] hover:bg-[#F8F9FA]"
              }`}
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isTestDrawerOpen ? "text-white" : "text-[#202125]"}`} />
              Test agent
            </button>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="h-11 px-5 text-[14px] font-medium text-[#202125] bg-white border border-[#E1E5EA] rounded-[6px] hover:bg-[#F8F9FA] disabled:bg-[#E4E5E8] disabled:text-[#8A8F99] disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isDirty || isSaving}
            title={isDirty ? "Save changes before publishing" : "Publish release to live agent"}
            className="inline-flex items-center gap-1.5 h-11 px-5 text-[14px] font-semibold text-white bg-[#F15A24] hover:bg-[#C94716] rounded-[6px] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
