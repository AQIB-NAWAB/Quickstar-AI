"use client";

import { Building2, Check, Info, Lock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface GoogleCalendarModalProps {
  open: boolean;
  workspaceName: string;
  onClose: () => void;
  onAuthorize: () => Promise<void>;
}

export function GoogleCalendarModal({
  open,
  workspaceName,
  onClose,
  onAuthorize,
}: GoogleCalendarModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [authorizing, setAuthorizing] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleAuthorizeClick() {
    setAuthorizing(true);
    try {
      await onAuthorize();
    } finally {
      setAuthorizing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gcal-modal-title"
        className="relative w-full max-w-[460px] bg-white rounded-16 p-6 sm:p-7 shadow-xl border border-[#EAECF0] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-6 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          {/* Google Calendar 31 Tile */}
          <div className="w-14 h-14 rounded-12 bg-white border border-[#DCE1E8] shadow-xs flex flex-col items-center justify-center overflow-hidden">
            <div className="w-full bg-[#1A73E8] py-0.5 text-center">
              <span className="text-[8px] font-bold text-white tracking-wider uppercase">Google</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xl font-bold text-[#1A73E8] leading-none">31</span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <h2 id="gcal-modal-title" className="text-xl font-bold tracking-tight text-[#18181B]">
              Connect Google Calendar
            </h2>
            <p className="text-xs text-[#71717A] max-w-sm leading-relaxed">
              QuickStart AI will request access to check availability and create appointment events in selected calendars.
            </p>
          </div>

          {/* Target Workspace Field */}
          <div className="w-full text-left space-y-1 pt-1">
            <label className="text-[11px] font-medium text-[#71717A]">Workspace</label>
            <div className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-8 bg-[#F8F9FB] border border-[#EAECF0] text-xs text-[#18181B]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-neutral-500" />
                <span className="font-medium">{workspaceName}</span>
              </div>
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          </div>

          {/* Permissions List */}
          <div className="w-full text-left space-y-2.5 pt-2">
            <span className="text-xs font-semibold text-[#18181B]">
              This will allow QuickStart AI to:
            </span>
            <div className="space-y-2 text-xs text-[#344054]">
              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#E9F9EF] text-[#027A48] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>View calendar availability</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#E9F9EF] text-[#027A48] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                </div>
                <span>Create and update appointment events</span>
              </div>
            </div>
          </div>

          {/* Information Notice */}
          <div className="w-full flex items-center gap-2 text-[11px] text-[#71717A] pt-1">
            <Info className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
            <span>You choose the Google account on the next screen.</span>
          </div>

          {/* Actions */}
          <div className="w-full flex items-center justify-end gap-3 pt-4 border-t border-[#EAECF0]">
            <button
              type="button"
              onClick={onClose}
              disabled={authorizing}
              className="px-4 py-2 rounded-8 bg-white border border-[#DCE1E8] text-xs font-semibold text-[#344054] hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAuthorizeClick}
              disabled={authorizing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-8 bg-[#FF571A] hover:bg-[#E0460D] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{authorizing ? "Connecting..." : "Authorize with Google"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
