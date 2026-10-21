"use client";

import { Search, Trash2, User } from "lucide-react";
import type { MemoryFact } from "../../lib/types";
import { formatRelativeTime } from "../../lib/format";

interface MemorySubjectHeaderProps {
  subjectKey: string;
  facts: MemoryFact[];
  totalCount: number;
  filterQuery: string;
  onFilterChange: (query: string) => void;
  onEraseClick: () => void;
}

export function MemorySubjectHeader({
  subjectKey,
  facts,
  totalCount,
  filterQuery,
  onFilterChange,
  onEraseClick,
}: MemorySubjectHeaderProps) {
  // Determine latest update timestamp across facts
  let latestUpdate: string | null = null;
  if (facts.length > 0) {
    let latestMs = 0;
    for (const f of facts) {
      const ms = new Date(f.updated_at).getTime();
      if (ms > latestMs) {
        latestMs = ms;
        latestUpdate = f.updated_at;
      }
    }
  }

  const relativeLatest = latestUpdate ? formatRelativeTime(latestUpdate) : null;
  const hasFacts = totalCount > 0;

  return (
    <div className="bg-white rounded-[12px] border border-[#EAECF0] p-5 sm:p-6 shadow-sm space-y-4">
      {/* Top Row: User Avatar, Subject Key, Capacity, Erase Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[10px] bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center shrink-0 text-[#667085]">
            <User className="w-5 h-5 stroke-[1.8]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-base font-bold text-[#18181B] break-words">
                {subjectKey}
              </span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#F2F4F7] text-[#475467] font-medium border border-[#DCE1E8]">
                {totalCount} / 50 facts
              </span>
            </div>

            {relativeLatest && (
              <p className="text-xs text-[#667085] mt-0.5">
                Last fact updated {relativeLatest}
              </p>
            )}
          </div>
        </div>

        {/* Erase action (hidden when 0 facts exist for this subject) */}
        {hasFacts && (
          <button
            type="button"
            onClick={onEraseClick}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#D92D20] hover:text-[#B42318] hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4 stroke-[1.8]" />
            <span>Erase subject memory</span>
          </button>
        )}
      </div>

      {/* Filter Row: Full-width search bar beneath header */}
      {hasFacts && (
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Filter facts by key or content"
            aria-label="Filter facts by key or content"
            className="w-full pl-10 pr-20 py-2.5 rounded-[8px] border border-[#DCE1E8] bg-white text-xs sm:text-sm text-[#18181B] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#FF571A]/20 focus:border-[#FF571A] transition-shadow"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#98A2B3] font-mono pointer-events-none">
            {facts.length} {facts.length === 1 ? "fact" : "facts"}
          </span>
        </div>
      )}
    </div>
  );
}
