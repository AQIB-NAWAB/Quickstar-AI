"use client";

import { Loader2 } from "lucide-react";

interface MemoryLoadingStateProps {
  subjectKey: string;
}

export function MemoryLoadingState({ subjectKey }: MemoryLoadingStateProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading facts"
      className="space-y-4"
    >
      {/* Subject Header Loading Strip */}
      <div className="bg-white border border-[#EAECF0] rounded-[12px] p-4 sm:p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#F2F4F7] flex items-center justify-center shrink-0">
            <Loader2 className="w-5 h-5 text-[#FF571A] animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm sm:text-base font-bold text-[#18181B]">
                {subjectKey}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[#667085]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#98A2B3]" />
                <span>Loading facts...</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton Rows (Desktop) */}
      <div className="hidden md:block bg-white border border-[#EAECF0] rounded-[12px] overflow-hidden shadow-sm">
        <div className="px-6 py-3.5 border-b border-[#EAECF0] bg-[#F8F9FB] flex items-center justify-between text-xs font-semibold text-[#667085]">
          <span className="w-1/4">Fact key</span>
          <span className="w-1/2">Fact text</span>
          <span className="w-1/6">Updated</span>
          <span className="w-12 text-right">Actions</span>
        </div>
        <div className="divide-y divide-[#EAECF0] p-4 space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 gap-4">
              <div className="h-6 w-32 bg-[#F2F4F7] rounded-[6px]" />
              <div className="h-5 flex-1 bg-[#F2F4F7] rounded-[6px]" />
              <div className="h-5 w-24 bg-[#F2F4F7] rounded-[6px]" />
              <div className="h-5 w-12 bg-[#F2F4F7] rounded-[6px]" />
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton Cards (Mobile) */}
      <div className="md:hidden space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-[#EAECF0] rounded-[12px] p-4 space-y-3 shadow-sm"
          >
            <div className="h-5 w-28 bg-[#F2F4F7] rounded-[6px]" />
            <div className="h-10 w-full bg-[#F2F4F7] rounded-[6px]" />
            <div className="flex items-center justify-between pt-2">
              <div className="h-4 w-20 bg-[#F2F4F7] rounded-[6px]" />
              <div className="h-8 w-20 bg-[#F2F4F7] rounded-[8px]" />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#98A2B3] pt-1">
        Fetching this subject&apos;s remembered context.
      </p>
    </div>
  );
}
