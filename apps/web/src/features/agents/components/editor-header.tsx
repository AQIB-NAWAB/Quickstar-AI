"use client";

import Link from "next/link";
import { ArrowLeft, Play, Sparkles } from "lucide-react";
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
  onPublish: () => void;
  onOpenTest: () => void;
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
  onOpenTest,
}: Props) {
  const isLive = Boolean(agent.production_version_id);

  let statusText = "";
  let statusColor = "text-[#667085]";

  if (saveError) {
    statusText = `Save failed: ${saveError}`;
    statusColor = "text-[#B42318]";
  } else if (isSaving) {
    statusText = "Saving changes...";
    statusColor = "text-[#667085]";
  } else if (isDirty) {
    statusText = "Unsaved changes";
    statusColor = "text-[#B54708]";
  } else if (saveSuccess) {
    statusText = "All changes saved";
    statusColor = "text-[#168A45]";
  }

  return (
    <div className="pb-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Back button, Name, Badges matching 2.png */}
        <div className="flex items-start gap-3.5 min-w-0">
          <Link
            href={`/workspaces/${workspaceId}/agents`}
            aria-label="Back to agents"
            className="p-1.5 mt-1 text-[#202125] hover:bg-[#F2F4F7] rounded-md transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#202125] tracking-tight truncate leading-tight">
              {agent.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[13px]">
              <span className="text-[#475467] bg-[#F2F4F7] px-2.5 py-0.5 rounded-[4px] border border-[#DCE1E8] font-medium">
                Draft v{agent.version}
              </span>

              {isLive ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[#168A45]">
                  <span className="w-2 h-2 rounded-full bg-[#168A45]" aria-hidden="true" />
                  {releaseNumber ? `Release #${releaseNumber} is live` : "Release is live"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[#667085] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#98A2B3]" aria-hidden="true" />
                  Unpublished
                </span>
              )}

              {statusText && (
                <span className={`text-[12px] font-medium ${statusColor}`}>
                  · {statusText}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Action Buttons matching 2.png */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <Link
            href={`/workspaces/${workspaceId}/agents/${agent.id}/canvas`}
            className="inline-flex items-center gap-2 h-10 px-3.5 text-[14px] font-semibold text-[#FA5D19] bg-orange-50 border border-orange-200 rounded-[6px] hover:bg-orange-100 transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-[#FA5D19]" />
            <span>Open Canvas</span>
          </Link>

          <button
            type="button"
            onClick={onOpenTest}
            className="inline-flex items-center gap-2 h-10 px-4 text-[14px] font-medium text-[#202125] bg-white border border-[#DCE1E8] rounded-[6px] hover:bg-[#F8F9FA] transition-colors shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current text-[#202125]" />
            <span>Test agent</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="h-10 px-5 text-[14px] font-medium text-[#202125] bg-white border border-[#DCE1E8] rounded-[6px] hover:bg-[#F8F9FA] disabled:bg-[#E4E5E8] disabled:text-[#8A8F99] disabled:border-transparent disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>

          <button
            type="button"
            onClick={onPublish}
            disabled={isDirty || isSaving}
            title={isDirty ? "Save changes before publishing" : "Publish release to live agent"}
            className="inline-flex items-center justify-center h-10 px-5 text-[14px] font-medium text-white bg-[#FF571A] hover:bg-[#E04B14] rounded-[6px] shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
