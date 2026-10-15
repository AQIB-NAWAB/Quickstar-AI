"use client";

import { useState } from "react";
import { FileText, Maximize2 } from "lucide-react";
import { InstructionsExpandModal } from "./instructions-expand-modal";

type Props = {
  instructions: string;
  isDirty: boolean;
  onChangeInstructions: (value: string) => void;
};

export function InstructionsTab({
  instructions,
  isDirty,
  onChangeInstructions,
}: Props) {
  const [expandModalOpen, setExpandModalOpen] = useState(false);

  const estimatedTokens = instructions.trim()
    ? Math.ceil(instructions.trim().length / 4)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-semibold text-[#202125]">Instructions</h2>
        <p className="mt-1 text-[14px] text-[#667085]">
          Tell your agent how to respond and what to focus on.
        </p>
      </div>

      {/* Editor Container */}
      <div className="bg-white border border-[#E1E5EA] rounded-[8px] overflow-hidden shadow-sm">
        {/* Top Bar */}
        <div className="px-5 py-3 border-b border-[#EDF0F2] bg-[#F8F9FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#667085]" />
            <span className="text-[14px] font-medium text-[#202125]">System instructions</span>
          </div>

          <button
            type="button"
            onClick={() => setExpandModalOpen(true)}
            title="Expand editor"
            aria-label="Expand editor"
            className="p-1 text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] rounded transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Writing Area */}
        <textarea
          rows={10}
          value={instructions}
          onChange={(e) => onChangeInstructions(e.target.value)}
          placeholder="Tell your agent how to respond, what tone to use, and when to hand off..."
          className="block w-full p-6 text-[15px] leading-relaxed text-[#202125] bg-transparent focus:outline-none resize-none placeholder-[#98A2B3] min-h-[288px]"
        />

        {/* Bottom Bar */}
        <div className="px-5 py-2.5 bg-[#FAFBFB] border-t border-[#EDF0F2] flex items-center justify-between text-[13px] text-[#667085]">
          <span>Plain text</span>
          <span>~{estimatedTokens} tokens (estimated)</span>
        </div>
      </div>

      {/* Saved / Unsaved Helper */}
      <div className="flex items-center gap-2 text-[13px] text-[#667085]">
        <FileText className="w-3.5 h-3.5 text-[#667085]" aria-hidden="true" />
        <span>
          {isDirty
            ? "Unsaved changes. Save your draft before publishing."
            : "Saved to draft. Publish when you're ready to update your live agent."}
        </span>
      </div>

      {/* Writing Guidance */}
      <div className="pt-2 space-y-2">
        <h3 className="text-[14px] font-semibold text-[#202125]">Writing good instructions</h3>
        <ul className="space-y-1.5 text-[14px] text-[#667085]">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#98A2B3]" />
            <span>Define the agent&apos;s role and scope.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#98A2B3]" />
            <span>Describe the tone and response length.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#98A2B3]" />
            <span>Explain when to hand off to your team.</span>
          </li>
        </ul>
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
