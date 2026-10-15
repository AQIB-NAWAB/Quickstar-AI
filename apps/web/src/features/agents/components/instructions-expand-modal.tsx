"use client";

import { useEffect, useRef } from "react";
import { FileText, Minimize2, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  instructions: string;
  onChange: (value: string) => void;
};

export function InstructionsExpandModal({
  isOpen,
  onClose,
  instructions,
  onChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => textareaRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const estimatedTokens = instructions.trim()
    ? Math.ceil(instructions.trim().length / 4)
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expanded-instructions-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div className="w-full max-w-[960px] h-[85vh] bg-white rounded-xl border border-[#E1E5EA] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EDF0F2] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#667085]" />
            <h2 id="expanded-instructions-title" className="text-[15px] font-semibold text-[#202125]">
              System instructions
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              title="Minimize"
              className="p-1.5 text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] rounded-md transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-1.5 text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Textarea */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <textarea
            ref={textareaRef}
            value={instructions}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Tell your agent how to respond and what to focus on..."
            className="w-full flex-1 p-4 text-[15px] leading-relaxed text-[#202125] bg-transparent resize-none focus:outline-hidden placeholder-[#98A2B3]"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#FAFBFB] border-t border-[#EDF0F2] flex items-center justify-between text-[12px] text-[#667085] shrink-0">
          <span>Plain text</span>
          <div className="flex items-center gap-4">
            <span>~{estimatedTokens} tokens</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#202125] text-white font-medium rounded-md hover:bg-black transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
