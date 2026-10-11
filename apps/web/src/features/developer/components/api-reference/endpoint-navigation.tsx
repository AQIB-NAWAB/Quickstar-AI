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
      return "bg-[#fa5d19] text-white";
    }
    switch (m) {
      case "GET":
        return "bg-neutral-100 text-[#262626]";
      case "POST":
        return "bg-neutral-100 text-[#fa5d19]";
      case "PATCH":
      case "PUT":
        return "bg-neutral-100 text-[#737373]";
      case "DELETE":
        return "bg-red-50 text-red-600";
      default:
        return "bg-neutral-100 text-[#737373]";
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-[#ededed] bg-white p-3 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#a3a3a3]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search endpoints"
          className="w-full rounded-lg border border-[#ededed] bg-[#f9f9f9] py-1.5 pl-8 pr-3 text-xs text-[#262626] placeholder-[#a3a3a3] focus:border-[#fa5d19] focus:bg-white focus:outline-none"
        />
      </div>

      {/* Endpoint Groups */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
        {tags.map((tag) => {
          const opsInTag = filtered.filter((op) => op.tags.includes(tag));
          if (opsInTag.length === 0) return null;

          return (
            <div key={tag} className="space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold  text-[#737373]">
                {tag}
              </div>
              <div className="space-y-0.5">
                {opsInTag.map((op) => {
                  const isSelected = op.id === selectedId;

                  if (!op.hasSpecCoverage) {
                    return (
                      <div
                        key={op.id}
                        className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-[#a3a3a3]"
                      >
                        <span className="font-mono text-[11px]">{op.summary}</span>
                        <span className="text-[10px] italic">Spec coverage pending</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={op.id}
                      onClick={() => onSelectOperation(op.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-[#fa5d19]/10 text-[#262626] font-medium"
                          : "text-[#737373] hover:bg-[#f9f9f9] hover:text-[#262626]"
                      }`}
                    >
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${getMethodBadgeClass(
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
