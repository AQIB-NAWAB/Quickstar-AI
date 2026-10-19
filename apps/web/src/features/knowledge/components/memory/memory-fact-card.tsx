"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { MemoryFact } from "../../lib/types";
import { formatDateTime, formatRelativeTime } from "../../lib/format";
import { MemoryFactEditor } from "./memory-fact-editor";

interface MemoryFactCardProps {
  fact: MemoryFact;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (factId: string, updatedText: string) => Promise<boolean>;
  onDeleteClick: (fact: MemoryFact) => void;
  onRequestDiscard: (action: () => void) => void;
  isSaving: boolean;
  onDirtyChange: (isDirty: boolean) => void;
}

export function MemoryFactCard({
  fact,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteClick,
  onRequestDiscard,
  isSaving,
  onDirtyChange,
}: MemoryFactCardProps) {
  const relativeTime = formatRelativeTime(fact.updated_at);
  const fullDateTime = formatDateTime(fact.updated_at);

  return (
    <div
      className={`p-4 rounded-[12px] border transition-colors shadow-sm space-y-3 ${
        isEditing
          ? "bg-[#FFF9F6] border-[#FFE0D2]"
          : "bg-white border-[#EAECF0]"
      }`}
    >
      {/* Top Header: Fact Key Badge & Status */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {fact.fact_key ? (
          <span className="font-mono text-xs px-2.5 py-1 rounded-[6px] bg-[#F2F4F7] text-[#344054] font-medium border border-[#DCE1E8] inline-block">
            {fact.fact_key}
          </span>
        ) : (
          <span className="text-xs text-[#667085] italic font-medium">
            General note
          </span>
        )}

        {isEditing && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFEAD5] text-[#D94600]">
            Editing
          </span>
        )}
      </div>

      {/* Body: Fact Text or Inline Editor */}
      {isEditing ? (
        <MemoryFactEditor
          fact={fact}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          onRequestDiscard={onRequestDiscard}
          isSaving={isSaving}
          onDirtyChange={onDirtyChange}
        />
      ) : (
        <p className="text-sm text-[#18181B] leading-relaxed whitespace-pre-wrap break-words">
          {fact.fact_text}
        </p>
      )}

      {/* Bottom Bar: Timestamp & >=44px Action Buttons */}
      {!isEditing && (
        <div className="pt-2 flex items-center justify-between border-t border-[#F2F4F7]">
          <span
            className="text-xs text-[#667085]"
            title={`Updated at ${fullDateTime}`}
          >
            {relativeTime}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onStartEdit}
              aria-label={`Edit fact ${fact.fact_key || fact.id}`}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[8px] border border-[#DCE1E8] bg-white text-[#475467] hover:text-[#18181B] hover:bg-[#F8F9FA] transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteClick(fact)}
              aria-label={`Delete fact ${fact.fact_key || fact.id}`}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[8px] border border-[#DCE1E8] bg-white text-[#475467] hover:text-[#D92D20] hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
