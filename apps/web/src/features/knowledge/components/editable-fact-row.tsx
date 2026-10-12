"use client";

import { useEffect, useRef, useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import type { MemoryFact } from "../lib/types";
import { updateFact } from "../lib/client";
import { formatDateTime } from "../lib/format";

interface EditableFactRowProps {
  workspaceId: string;
  fact: MemoryFact;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onFactUpdated: (updated: MemoryFact) => void;
  onDeleteClicked: (fact: MemoryFact) => void;
  hasDirtyEdit: boolean;
  setHasDirtyEdit: (dirty: boolean) => void;
}

export function EditableFactRow({
  workspaceId,
  fact,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onFactUpdated,
  onDeleteClicked,
  setHasDirtyEdit,
}: EditableFactRowProps) {
  const [draftText, setDraftText] = useState(fact.fact_text);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement>(null);

  // Sync draft when fact changes or edit starts
  useEffect(() => {
    if (isEditing) {
      setDraftText(fact.fact_text);
      setSaveError(null);
      setHasDirtyEdit(false);
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 10);
    }
  }, [isEditing, fact.fact_text, setHasDirtyEdit]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setDraftText(val);
    setHasDirtyEdit(val.trim() !== fact.fact_text.trim());
    if (saveError) setSaveError(null);
  }

  async function handleSave() {
    const trimmed = draftText.trim();
    if (!trimmed) {
      setSaveError("Fact text cannot be empty.");
      return;
    }
    if (trimmed.length > 2048) {
      setSaveError("Fact text must be at most 2048 characters.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const res = await updateFact(workspaceId, fact.id, { fact_text: trimmed });
    setIsSaving(false);

    if (res.fact) {
      setHasDirtyEdit(false);
      onFactUpdated(res.fact);
      onCancelEdit();
    } else {
      setSaveError(res.error?.message || "Failed to update fact.");
    }
  }

  function handleCancel() {
    setDraftText(fact.fact_text);
    setSaveError(null);
    setHasDirtyEdit(false);
    onCancelEdit();
    setTimeout(() => {
      editTriggerRef.current?.focus();
    }, 10);
  }

  const isUnchanged = draftText.trim() === fact.fact_text.trim();
  const isInvalid = !draftText.trim() || draftText.trim().length > 2048;

  return (
    <tr className="hover:bg-heat-8/30 transition-colors group">
      {/* Fact Key */}
      <td data-label="Fact key" className="py-2 px-4 font-mono text-[11px] text-neutral-600 align-top max-w-[200px] break-words">
        {fact.fact_key || "—"}
      </td>

      {/* Fact Text or Editor */}
      <td data-label="Fact" className="py-2 px-4 text-xs text-accent-black align-top min-w-[280px]">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              aria-label={`Fact text for ${fact.fact_key || fact.id}`}
              ref={textareaRef}
              rows={3}
              value={draftText}
              onChange={handleChange}
              disabled={isSaving}
              className="w-full rounded-8 border border-border-faint bg-white p-2.5 text-xs text-accent-black focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow leading-relaxed"
            />
            {saveError ? (
              <p className="text-[11px] text-accent-crimson font-medium">{saveError}</p>
            ) : null}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || isUnchanged || isInvalid}
                className="px-3 py-1.5 rounded-8 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-40"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-8 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed break-words">{fact.fact_text}</p>
        )}
      </td>

      {/* Updated Timestamp */}
      <td data-label="Updated" className="py-2 px-4 whitespace-nowrap text-neutral-500 text-xs align-top">
        {formatDateTime(fact.updated_at)}
      </td>

      {/* Actions */}
      <td data-label="Actions" className="py-2 px-4 text-right whitespace-nowrap align-top">
        {!isEditing ? (
          <div className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 focus-within:opacity-100">
            <button
              ref={editTriggerRef}
              type="button"
              onClick={onStartEdit}
              className="p-1.5 rounded-6 text-neutral-400 hover:text-accent-black hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-heat-24 transition-colors"
              title="Edit fact"
              aria-label={`Edit fact ${fact.fact_key || fact.id}`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteClicked(fact)}
              className="p-1.5 rounded-6 text-neutral-400 hover:text-accent-crimson hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors"
              title="Delete fact"
              aria-label={`Delete fact ${fact.fact_key || fact.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
