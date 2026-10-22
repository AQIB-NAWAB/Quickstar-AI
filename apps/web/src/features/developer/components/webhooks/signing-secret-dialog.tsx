"use client";

import { AlertTriangle, Check, Copy, X } from "lucide-react";
import { useState } from "react";

interface SigningSecretDialogProps {
  secret: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SigningSecretDialog({
  secret,
  isOpen,
  onClose,
}: SigningSecretDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Signing secret"
        className="w-full max-w-md rounded-12 border border-[#EAECF0] bg-white p-6 shadow-xl space-y-4 text-xs text-[#18181B]"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0]">
          <h2 className="text-sm font-bold text-[#18181B]">
            Webhook Signing Secret Generated
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#71717A] hover:text-[#18181B] transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="rounded-8 border border-[#FEDF89] bg-[#FFF4ED] p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#B54708]">
            <AlertTriangle className="w-4 h-4 text-[#FF571A] shrink-0" />
            <span>Copy your webhook signing secret now</span>
          </div>
          <p className="text-[11px] text-[#52525B] pl-6 leading-relaxed">
            For security, this secret will NOT be displayed again. Use it to verify the
            <code className="font-mono text-[#18181B] bg-white px-1 py-0.5 rounded mx-1">
              X-QuickStart-Signature
            </code>
            header on incoming delivery payloads.
          </p>
        </div>

        {/* Signing Secret Box */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[#71717A]">
            Signing Secret Key
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={secret}
              className="w-full rounded-8 border border-[#EAECF0] bg-[#F8F9FB] py-2 pl-3 pr-10 font-mono text-[11px] text-[#18181B] focus:outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="absolute right-2.5 top-2 p-1 text-[#71717A] hover:text-[#18181B]"
              title="Copy secret"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[#027A48]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Done Button */}
        <div className="pt-2 border-t border-[#EAECF0]">
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-full rounded-8 bg-[#FF571A] py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#E0460D] transition-colors"
          >
            I have securely saved this signing secret
          </button>
        </div>
      </div>
    </div>
  );
}
