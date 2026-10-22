"use client";

import { Info } from "lucide-react";
import type { MemoryFact } from "../../lib/types";
import { MemoryFactRow } from "./memory-fact-row";
import { MemoryFactCard } from "./memory-fact-card";

interface MemoryFactsTableProps {
  facts: MemoryFact[];
  filteredFacts: MemoryFact[];
  totalFactsCount: number;
  filterQuery: string;
  editingFactId: string | null;
  onStartEdit: (factId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (factId: string, updatedText: string) => Promise<boolean>;
  onDeleteClick: (fact: MemoryFact) => void;
  onRequestDiscard: (action: () => void) => void;
  isSavingEdit: boolean;
  onDirtyChange: (isDirty: boolean) => void;
}

export function MemoryFactsTable({
  filteredFacts,
  totalFactsCount,
  filterQuery,
  editingFactId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteClick,
  onRequestDiscard,
  isSavingEdit,
  onDirtyChange,
}: MemoryFactsTableProps) {
  const isFiltered = filterQuery.trim().length > 0;
  const remainingAvailable = Math.max(0, 50 - totalFactsCount);
  const capacityPercent = Math.min(100, (totalFactsCount / 50) * 100);

  return (
    <div className="space-y-4">
      {/* Desktop View: Full 4-Column Table */}
      <div className="hidden md:block bg-white rounded-[12px] border border-[#EAECF0] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#EAECF0] bg-[#F8F9FB] text-xs font-semibold text-[#667085]">
              <th scope="col" className="py-3 px-6 w-[220px]">
                Fact key
              </th>
              <th scope="col" className="py-3 px-6 min-w-[320px]">
                Fact text
              </th>
              <th scope="col" className="py-3 px-6 w-[140px]">
                Updated
              </th>
              <th scope="col" className="py-3 px-6 text-right w-[100px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAECF0]">
            {filteredFacts.map((fact) => (
              <MemoryFactRow
                key={fact.id}
                fact={fact}
                isEditing={editingFactId === fact.id}
                onStartEdit={() => onStartEdit(fact.id)}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                onDeleteClick={onDeleteClick}
                onRequestDiscard={onRequestDiscard}
                isSaving={isSavingEdit && editingFactId === fact.id}
                onDirtyChange={onDirtyChange}
              />
            ))}
          </tbody>
        </table>

        {/* Desktop Table Footer matching Image 1 */}
        <div className="px-6 py-4 bg-[#F8F9FB] border-t border-[#EAECF0] flex items-center justify-between gap-4 flex-wrap text-xs text-[#667085]">
          <p>
            {isFiltered
              ? `Showing ${filteredFacts.length} of ${totalFactsCount} facts`
              : `Showing all ${totalFactsCount} ${totalFactsCount === 1 ? "fact" : "facts"} for this subject`}
          </p>

          <div className="flex items-center gap-3">
            <div
              className="w-24 sm:w-32 h-1.5 bg-[#EAECF0] rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={totalFactsCount}
              aria-valuemin={0}
              aria-valuemax={50}
              aria-label="Subject facts capacity"
            >
              <div
                className="h-full bg-[#202125] rounded-full transition-all duration-300"
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
            <span className="font-mono text-xs text-[#475467]">
              {remainingAvailable} {remainingAvailable === 1 ? "fact" : "facts"} available
            </span>
          </div>
        </div>
      </div>

      {/* Mobile View: Stacked Cards matching Image 6 */}
      <div className="md:hidden space-y-3">
        {filteredFacts.map((fact) => (
          <MemoryFactCard
            key={fact.id}
            fact={fact}
            isEditing={editingFactId === fact.id}
            onStartEdit={() => onStartEdit(fact.id)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onDeleteClick={onDeleteClick}
            onRequestDiscard={onRequestDiscard}
            isSaving={isSavingEdit && editingFactId === fact.id}
            onDirtyChange={onDirtyChange}
          />
        ))}

        {/* Mobile Capacity Strip */}
        <div className="p-3.5 bg-white rounded-[12px] border border-[#EAECF0] flex items-center justify-between text-xs text-[#667085] shadow-sm">
          <span>
            {isFiltered
              ? `${filteredFacts.length} of ${totalFactsCount} shown`
              : `${totalFactsCount} facts stored`}
          </span>
          <span className="font-mono text-[#475467]">
            {remainingAvailable} available
          </span>
        </div>
      </div>

      {/* Informational Callout Line matching Image 1 */}
      <div className="flex items-start sm:items-center gap-2 pt-2 text-xs text-[#667085]">
        <Info className="w-4 h-4 text-[#98A2B3] shrink-0 mt-0.5 sm:mt-0" />
        <span>
          Facts provide customer context across agent sessions. Subject keys are matched exactly.
        </span>
      </div>
    </div>
  );
}
