"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { type OpenApiOperation } from "../../lib/types";

interface EndpointNavigationProps {
  operations: OpenApiOperation[];
  selectedId: string;
  onSelectOperation: (id: string) => void;
}

export function EndpointNavigation({
  operations,
  selectedId,
  onSelectOperation,
}: EndpointNavigationProps) {
  const [search, setSearch] = useState("");

  const filtered = operations.filter((op) => {
    const query = search.toLowerCase();
    return (
      op.path.toLowerCase().includes(query) ||
      op.summary.toLowerCase().includes(query) ||
      op.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  // Group by tags
  const tags = Array.from(new Set(operations.flatMap((op) => op.tags)));

  const getMethodBadgeClass = (method: string, isSelected: boolean) => {
    const m = method.toUpperCase();
    if (isSelected) {
      return "bg-[#FF571A] text-white";
    }
    switch (m) {
      case "GET":
        return "bg-[#E9F9EF] text-[#027A48] border border-[#A6F4C5]";
      case "POST":
        return "bg-[#FFF4ED] text-[#FF571A] border border-[#FEDF89]";
      case "PATCH":
      case "PUT":
        return "bg-[#FFF4ED] text-[#B54708] border border-[#FEDF89]";
      case "DELETE":
        return "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]";
      default:
        return "bg-[#F8F9FB] text-[#71717A] border border-[#EAECF0]";
    }
  };

  return (
    <div className="flex flex-col h-full rounded-12 border border-[#EAECF0] bg-white p-3 space-y-3 text-xs">
      {/* Search matching Image 5 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#71717A]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter endpoints..."
          className="w-full rounded-8 border border-[#EAECF0] bg-[#F8F9FB] py-1.5 pl-8 pr-3 text-xs text-[#18181B] placeholder-[#71717A] focus:border-[#FF571A] focus:bg-white focus:outline-none"
        />
      </div>

      {/* Endpoint Groups */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {tags.map((tag) => {
          const opsInTag = filtered.filter((op) => op.tags.includes(tag));
          if (opsInTag.length === 0) return null;

          return (
            <div key={tag} className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                {tag}
              </div>
              <div className="space-y-0.5">
                {opsInTag.map((op) => {
                  const isSelected = op.id === selectedId;

                  return (
                    <button
                      key={op.id}
                      onClick={() => onSelectOperation(op.id)}
                      className={`flex w-full items-center gap-2 rounded-8 px-2.5 py-1.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-[#FFF4ED] text-[#18181B] font-semibold border-l-3 border-l-[#FF571A]"
                          : "text-[#52525B] hover:bg-[#F8F9FB] hover:text-[#18181B]"
                      }`}
                    >
                      <span
                        className={`rounded-4 px-1.5 py-0.2 font-mono text-[10px] font-bold shrink-0 ${getMethodBadgeClass(
                          op.method,
                          isSelected
                        )}`}
                      >
                        {op.method.toUpperCase()}
                      </span>
                      <span className="truncate">{op.summary}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
