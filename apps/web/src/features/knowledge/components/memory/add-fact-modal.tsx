"use client";

import { useEffect, useRef, useState } from "react";
import { Database, Loader2, Shield, User, X } from "lucide-react";
import type { CreateFactInput, MemoryFact } from "../../lib/types";

interface AddFactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestDiscard: (action: () => void) => void;
  subjectKey: string;
  existingFacts: MemoryFact[];
  totalFactsCount: number;
  onSaveFact: (input: CreateFactInput) => Promise<{ success: boolean; error?: string }>;
}

export function AddFactModal({
  isOpen,
  onClose,
  onRequestDiscard,
  subjectKey,
  existingFacts,
  totalFactsCount,
  onSaveFact,
}: AddFactModalProps) {
  const [factKey, setFactKey] = useState("");
  const [factText, setFactText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = factText.trim().length > 0 || factKey.trim().length > 0;

  useEffect(() => {
    if (isOpen) {
      setFactKey("");
      setFactText("");
      setIsSaving(false);
      setFormError(null);
      setTimeout(() => textInputRef.current?.focus(), 50);

      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSaving) {
        e.preventDefault();
        handleAttemptClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, isDirty]);

  if (!isOpen) return null;

  function handleAttemptClose() {
    if (isDirty) {
      onRequestDiscard(() => {
        setFactKey("");
        setFactText("");
        onClose();
      });
    } else {
      onClose();
    }
  }

  // Keyed upsert detection
  const normalizedKey = factKey.trim();
  const existingKeyedFact = normalizedKey
    ? existingFacts.find((f) => f.fact_key?.toLowerCase() === normalizedKey.toLowerCase())
    : null;

  const isAtCapacity = totalFactsCount >= 50 && !existingKeyedFact;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedText = factText.trim();
    if (!trimmedText) {
      setFormError("Fact text is required.");
      return;
    }
    if (trimmedText.length > 2048) {
      setFormError("Fact text must be at most 2,048 characters.");
      return;
    }

    if (isAtCapacity) {
      setFormError("Maximum 50 facts per subject reached. Cannot add a new fact.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const result = await onSaveFact({
      subject_key: subjectKey,
      fact_key: normalizedKey || null,
      fact_text: trimmedText,
    });

    setIsSaving(false);

    if (result.success) {
      onClose();
    } else {
      setFormError(result.error || "Failed to save memory fact.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-fact-title"
      aria-describedby="add-fact-subtitle"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#101828]/40 backdrop-blur-[2px] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          handleAttemptClose();
        }
      }}
    >
      <div className="w-full sm:max-w-[560px] max-h-[92svh] sm:max-h-[90vh] bg-white rounded-t-[16px] sm:rounded-[12px] border border-[#EAECF0] shadow-[0_20px_60px_rgba(16,24,40,0.18)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#EAECF0] flex items-start justify-between gap-4 shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#FFF3ED] text-[#FF571A] flex items-center justify-center shrink-0 border border-[#FFE0D2]">
              <Database className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h2 id="add-fact-title" className="text-lg sm:text-xl font-bold text-[#18181B] tracking-tight">
                Add Memory Fact
              </h2>
              <p id="add-fact-subtitle" className="text-xs sm:text-sm text-[#667085] mt-0.5">
                Remember useful context for future conversations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            disabled={isSaving}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#475467] hover:bg-[#F2F4F7] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="add-fact-form" className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Field A: Subject Key (Read-only) */}
          <div className="space-y-1.5">
            <label htmlFor="modal-subject-key" className="block text-xs font-semibold text-[#18181B]">
              Subject key <span className="text-[#FF571A]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="modal-subject-key"
                type="text"
                readOnly
                value={subjectKey}
                className="w-full pl-9 pr-3 py-2 rounded-[8px] border border-[#DCE1E8] bg-[#F8F9FB] font-mono text-xs sm:text-sm text-[#344054] cursor-default focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#667085]">
              <span>The customer or visitor this fact belongs to.</span>
              <span className="font-mono">{subjectKey.length} / 255</span>
            </div>
          </div>

          {/* Field B: Fact Key (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="modal-fact-key" className="block text-xs font-semibold text-[#18181B]">
              Fact key <span className="text-xs font-normal text-[#667085]">(optional)</span>
            </label>
            <input
              id="modal-fact-key"
              type="text"
              value={factKey}
              maxLength={128}
              onChange={(e) => {
                setFactKey(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="e.g. appointment_preference"
              className="w-full px-3 py-2 rounded-[8px] border border-[#DCE1E8] bg-white font-mono text-xs sm:text-sm text-[#18181B] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#FF571A]/20 focus:border-[#FF571A] transition-shadow"
            />
            <div className="flex items-center justify-between text-[11px] text-[#667085]">
              <span>A short label to help identify this fact.</span>
              <span className="font-mono">{factKey.length} / 128</span>
            </div>

            {/* Keyed Upsert helper notice */}
            {existingKeyedFact && (
              <div className="p-2.5 rounded-[8px] bg-[#FFF8F2] border border-[#FFE0D2] text-[11px] text-[#B54708] leading-tight">
                A fact with this key already exists. Saving will replace its text.
              </div>
            )}
          </div>

          {/* Field C: Fact Text */}
          <div className="space-y-1.5">
            <label htmlFor="modal-fact-text" className="block text-xs font-semibold text-[#18181B]">
              Fact text <span className="text-[#FF571A]">*</span>
            </label>
            <textarea
              ref={textInputRef}
              id="modal-fact-text"
              rows={4}
              value={factText}
              maxLength={2048}
              onChange={(e) => {
                setFactText(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Prefers appointments on Monday mornings after 10 AM."
              className="w-full p-3 rounded-[8px] border border-[#DCE1E8] bg-white text-xs sm:text-sm text-[#18181B] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#FF571A]/20 focus:border-[#FF571A] transition-shadow leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-[#667085]">
              <span>Keep facts concise and useful.</span>
              <span className="font-mono">{factText.length} / 2048</span>
            </div>
          </div>

          {/* Safety Warning Card matching Image 2 */}
          <div className="flex items-center gap-2.5 p-3 rounded-[8px] bg-[#F8F9FB] border border-[#EAECF0] text-[#475467] text-xs">
            <Shield className="w-4 h-4 text-[#667085] shrink-0" />
            <span>Do not include passwords, API keys, or access tokens.</span>
          </div>

          {/* Form Error alert */}
          {formError && (
            <div role="alert" className="p-2.5 rounded-[8px] bg-red-50 border border-red-200 text-xs text-[#B42318]">
              {formError}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EAECF0] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-[#667085]">
            <span className="font-semibold text-[#18181B]">{totalFactsCount} of 50 facts</span> used for this subject
          </p>

          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={handleAttemptClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-[8px] border border-[#DCE1E8] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-fact-form"
              disabled={isSaving || !factText.trim() || isAtCapacity}
              className="px-4 py-2.5 rounded-[8px] bg-[#FF571A] hover:bg-[#E0460D] text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>+ Save fact</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
