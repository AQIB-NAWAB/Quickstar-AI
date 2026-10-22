"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { MemoryFact } from "../../lib/types";

interface MemoryFactEditorProps {
  fact: MemoryFact;
  onSave: (factId: string, updatedText: string) => Promise<boolean>;
  onCancel: () => void;
  onRequestDiscard: (action: () => void) => void;
  isSaving: boolean;
  onDirtyChange: (isDirty: boolean) => void;
}

export function MemoryFactEditor({
  fact,
  onSave,
  onCancel,
  onRequestDiscard,
  isSaving,
  onDirtyChange,
}: MemoryFactEditorProps) {
  const [draft, setDraft] = useState(fact.fact_text);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = draft.trim() !== fact.fact_text.trim();
  const isValid = draft.trim().length > 0 && draft.trim().length <= 2048;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    textareaRef.current?.focus();
    // Position cursor at end of text
    textareaRef.current?.setSelectionRange(draft.length, draft.length);
  }, []);

  function handleCancelClick() {
    if (isDirty) {
      onRequestDiscard(() => {
        setDraft(fact.fact_text);
        onCancel();
      });
    } else {
      onCancel();
    }
  }

  async function handleSaveClick() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Fact text cannot be empty.");
      return;
    }
    if (trimmed.length > 2048) {
      setError("Fact text cannot exceed 2,048 characters.");
      return;
    }

    setError(null);
    const success = await onSave(fact.id, trimmed);
    if (!success) {
      setError("Failed to save changes. Please try again.");
    }
  }

  return (
    <div className="space-y-2.5">
      <textarea
        ref={textareaRef}
        rows={3}
        value={draft}
        maxLength={2048}
        disabled={isSaving}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        aria-label={`Edit fact text for ${fact.fact_key || fact.id}`}
        className="w-full p-3 rounded-[8px] border border-[#EAECF0] bg-white text-sm text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#FF571A] focus:border-[#FF571A] transition-shadow leading-relaxed"
      />

      <div className="flex items-center justify-between text-xs text-[#667085]">
        <span>Changes apply to future agent conversations.</span>
        <span className="font-mono">{draft.length} / 2048</span>
      </div>

      {isDirty && (
        <div className="flex items-center gap-1.5 text-xs text-[#FF571A] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#FF571A]" />
          <span>Unsaved changes</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-[#D92D20] font-medium" role="alert">
          {error}
        </p>
      )}

      {/* Action buttons (inline for mobile card or row) */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => void handleSaveClick()}
          disabled={isSaving || !isValid || !isDirty}
          className="px-3.5 py-1.5 rounded-[8px] bg-[#FF571A] hover:bg-[#E0460D] text-white text-xs font-semibold transition-colors disabled:opacity-40 inline-flex items-center gap-1.5 shadow-sm"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span>Save</span>
        </button>

        <button
          type="button"
          onClick={handleCancelClick}
          disabled={isSaving}
          className="px-3.5 py-1.5 rounded-[8px] border border-[#DCE1E8] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}
