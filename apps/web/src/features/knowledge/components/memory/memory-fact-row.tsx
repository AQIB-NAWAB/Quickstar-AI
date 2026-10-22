"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { MemoryFact } from "../../lib/types";
import { formatDateTime, formatRelativeTime } from "../../lib/format";
import { MemoryFactEditor } from "./memory-fact-editor";

interface MemoryFactRowProps {
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

export function MemoryFactRow({
  fact,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteClick,
  onRequestDiscard,
  isSaving,
  onDirtyChange,
}: MemoryFactRowProps) {
  const relativeTime = formatRelativeTime(fact.updated_at);
  const fullDateTime = formatDateTime(fact.updated_at);

  return (
    <tr
      className={`transition-colors border-b border-[#EAECF0] last:border-b-0 ${
        isEditing
          ? "bg-[#FFF9F6]"
          : "hover:bg-[#F8F9FB] group"
      }`}
    >
      {/* Column 1: Fact Key */}
      <td className="py-4 px-6 align-top w-[220px]">
        <div className="space-y-1">
          {fact.fact_key ? (
            <span className="font-mono text-xs px-2.5 py-1 rounded-[6px] bg-[#F2F4F7] text-[#344054] font-medium border border-[#DCE1E8] inline-block max-w-[200px] truncate">
              {fact.fact_key}
            </span>
          ) : (
            <span className="text-xs text-[#98A2B3]">—</span>
          )}

          {isEditing && (
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFEAD5] text-[#D94600]">
                Editing
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Column 2: Fact Text or Editor */}
      <td className="py-4 px-6 align-top min-w-[320px]">
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
      </td>

      {/* Column 3: Updated */}
      <td className="py-4 px-6 align-top w-[140px] whitespace-nowrap">
        <span
          className="text-xs text-[#667085] cursor-default"
          title={`Updated at ${fullDateTime}`}
        >
          {relativeTime}
        </span>
      </td>

      {/* Column 4: Actions */}
      <td className="py-4 px-6 align-top text-right w-[100px] whitespace-nowrap">
        {!isEditing ? (
          <div className="inline-flex items-center gap-1 justify-end opacity-90 group-hover:opacity-100">
            <button
              type="button"
              onClick={onStartEdit}
              aria-label={`Edit fact ${fact.fact_key || fact.id}`}
              className="p-1.5 rounded-md text-[#667085] hover:text-[#18181B] hover:bg-[#F2F4F7] transition-colors"
              title="Edit fact"
            >
              <Pencil className="w-4 h-4 stroke-[1.8]" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteClick(fact)}
              aria-label={`Delete fact ${fact.fact_key || fact.id}`}
              className="p-1.5 rounded-md text-[#667085] hover:text-[#D92D20] hover:bg-red-50 transition-colors"
              title="Delete fact"
            >
              <Trash2 className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
