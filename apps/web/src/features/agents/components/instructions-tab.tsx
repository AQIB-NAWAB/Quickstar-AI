"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Maximize2 } from "lucide-react";
import { InstructionsExpandModal } from "./instructions-expand-modal";

type Props = {
  instructions: string;
  isDirty: boolean;
  version?: number;
  onChangeInstructions: (value: string) => void;
};

export function InstructionsTab({
  instructions,
  isDirty,
  version = 1,
  onChangeInstructions,
}: Props) {
  const [expandModalOpen, setExpandModalOpen] = useState(false);

  const estimatedTokens = instructions.trim()
    ? Math.ceil(instructions.trim().length / 4)
    : 0;

  return (
    <div className="space-y-6 max-w-full">
      {/* Title Row matching 2.png */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-semibold text-[#202125] leading-tight">Instructions</h2>
          <p className="mt-1 text-[14px] text-[#667085]">
            Define how your agent responds.
          </p>
        </div>

        <span className="text-[#475467] bg-[#F2F4F7] px-2.5 py-0.5 rounded-[4px] border border-[#DCE1E8] text-[13px] font-medium shrink-0">
          Draft v{version}
        </span>
      </div>

      {/* Full-width Editor Card matching 2.png */}
      <div className="bg-white border border-[#DCE1E8] rounded-[8px] overflow-hidden shadow-xs">
        {/* Card Header (~48-52px height) */}
        <div className="px-5 py-3 border-b border-[#EAECF0] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[#667085]" />
            <span className="text-[14px] font-semibold text-[#202125]">System instructions</span>
          </div>

          <button
            type="button"
            onClick={() => setExpandModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#DCE1E8] bg-white text-[13px] font-medium text-[#202125] hover:bg-[#F8F9FA] transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#667085]" />
            <span>Expand</span>
          </button>
        </div>

        {/* Writing Area: 16px, ~26px line height, 24px padding, 280-320px height */}
        <textarea
          rows={11}
          value={instructions}
          onChange={(e) => onChangeInstructions(e.target.value)}
          placeholder="You are QuickStart's demo support agent for the website widget..."
          className="block w-full p-6 text-[16px] leading-[26px] text-[#202125] bg-transparent focus:outline-none resize-none placeholder-[#98A2B3] min-h-[280px] sm:min-h-[300px]"
        />

        {/* Footer inside editor: Plain text left, estimated tokens right */}
        <div className="px-5 py-2.5 bg-white border-t border-[#EAECF0] flex items-center justify-between text-[13px] text-[#667085]">
          <span>Plain text</span>
          <span>~{estimatedTokens} tokens (estimated)</span>
        </div>
      </div>

      {/* Save-state strip below editor matching 2.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[13px]">
        <div className="flex items-center gap-2">
          {isDirty ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#F79009]" />
              <span className="text-[#B54708] font-medium">Unsaved changes</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#168A45]" />
              <span className="text-[#168A45] font-medium">All changes saved to draft</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[#667085]">
          <FileText className="w-4 h-4 text-[#667085]" aria-hidden="true" />
          <span>Publish to update your live agent</span>
        </div>
      </div>

      <InstructionsExpandModal
        isOpen={expandModalOpen}
        onClose={() => setExpandModalOpen(false)}
        instructions={instructions}
        onChange={onChangeInstructions}
      />
    </div>
  );
}
