"use client";

import { Search, Loader2 } from "lucide-react";

interface MemorySubjectLookupProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (subject: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export function MemorySubjectLookup({
  value,
  onChange,
  onSubmit,
  isLoading,
  error,
}: MemorySubjectLookupProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
  }

  function handleChipClick(chipKey: string) {
    onChange(chipKey);
    onSubmit(chipKey);
  }

  const isBlank = !value.trim();

  return (
    <div className="bg-white rounded-[12px] border border-[#EAECF0] p-5 sm:p-6 shadow-sm space-y-3">
      <h2 className="text-sm font-semibold text-[#18181B]">
        Find a subject
      </h2>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter an exact subject key"
            autoComplete="off"
            spellCheck="false"
            className="w-full pl-10 pr-3.5 py-2.5 rounded-[8px] border border-[#DCE1E8] bg-white font-mono text-sm text-[#18181B] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#FF571A]/20 focus:border-[#FF571A] transition-shadow"
          />
        </div>

        <button
          type="submit"
          disabled={isBlank || isLoading}
          className="w-full sm:w-auto px-5 py-2.5 rounded-[8px] bg-[#18181B] hover:bg-[#2E3036] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0 inline-flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <span>Load subject</span>
          )}
        </button>
      </form>

      {/* Suggestion chip & matching helper */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-[#667085] pt-0.5">
        <span>Exact subject key</span>
        <button
          type="button"
          onClick={() => handleChipClick("demo-visitor")}
          className="font-mono text-xs px-2.5 py-0.5 rounded-[6px] bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#344054] font-medium border border-[#DCE1E8] transition-colors cursor-pointer"
        >
          demo-visitor
        </button>
      </div>

      {error && (
        <p className="text-xs text-[#D92D20] font-medium pt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
