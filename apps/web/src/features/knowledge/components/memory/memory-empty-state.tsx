"use client";

import { Database } from "lucide-react";

export function MemoryInitialState() {
  return (
    <div className="bg-white border border-[#EAECF0] rounded-[12px] p-8 sm:p-12 text-center shadow-sm">
      <div className="w-14 h-14 rounded-[12px] bg-[#FFF3ED] text-[#FF571A] flex items-center justify-center mx-auto mb-5 border border-[#FFE0D2]">
        <Database className="w-7 h-7 stroke-[1.8]" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-[#18181B] tracking-tight">
        A little context. Better conversations.
      </h2>

      <p className="text-sm text-[#667085] max-w-md mx-auto mt-2 leading-relaxed">
        Memory keeps useful customer facts available across agent sessions. Load a subject to inspect, edit, or remove their stored context.
      </p>

      {/* Illustrative Example Fact Card */}
      <div className="mt-8 max-w-md mx-auto p-4 rounded-[10px] bg-[#F8F9FB] border border-[#EAECF0] text-left">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#667085] mb-2">
          Example fact
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <span className="font-mono text-xs px-2.5 py-1 rounded-[6px] bg-white border border-[#DCE1E8] text-[#344054] font-medium shrink-0 self-start">
            language
          </span>
          <span className="text-sm text-[#18181B] font-medium leading-normal">
            Prefers conversations in English.
          </span>
        </div>
      </div>

      <p className="text-xs text-[#98A2B3] mt-5">
        Up to 50 facts per subject · 2,048 characters per fact
      </p>
    </div>
  );
}

interface ZeroFactsStateProps {
  subjectKey: string;
  onAddFirstFact: () => void;
}

export function MemoryZeroFactsState({ onAddFirstFact }: ZeroFactsStateProps) {
  return (
    <div className="bg-white border border-[#EAECF0] rounded-[12px] p-8 sm:p-12 text-center shadow-sm">
      <div className="w-14 h-14 rounded-[12px] bg-[#FFF3ED] text-[#FF571A] flex items-center justify-center mx-auto mb-5 border border-[#FFE0D2]">
        <Database className="w-7 h-7 stroke-[1.8]" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-[#18181B] tracking-tight">
        No memory facts recorded for this subject yet.
      </h2>

      <p className="text-sm text-[#667085] max-w-md mx-auto mt-2 leading-relaxed">
        Add a useful preference or detail to help agents provide more personal responses.
      </p>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onAddFirstFact}
          className="px-4 py-2.5 rounded-[8px] bg-[#FF571A] hover:bg-[#E0460D] text-white text-sm font-semibold transition-colors shadow-sm inline-flex items-center gap-1.5"
        >
          <span>+ Add first fact</span>
        </button>
      </div>

      <p className="text-xs text-[#98A2B3] mt-6">
        Subject keys are matched exactly.
      </p>
    </div>
  );
}

interface FilterEmptyStateProps {
  onClearFilter: () => void;
}

export function MemoryFilterEmptyState({ onClearFilter }: FilterEmptyStateProps) {
  return (
    <div className="bg-white border border-[#EAECF0] rounded-[12px] p-8 sm:p-10 text-center shadow-sm">
      <h3 className="text-base font-semibold text-[#18181B]">
        No facts match your filter
      </h3>
      <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
        Try adjusting your filter query or clearing it to see all recorded facts for this subject.
      </p>
      <div className="mt-4">
        <button
          type="button"
          onClick={onClearFilter}
          className="px-3.5 py-2 rounded-[8px] bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#344054] text-xs font-semibold transition-colors"
        >
          Clear filter
        </button>
      </div>
    </div>
  );
}
