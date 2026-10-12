"use client";

import { AlertCircle,Check,Copy,X } from "lucide-react";
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
      <div role="dialog" aria-modal="true" aria-label="Signing secret" className="w-full max-w-md rounded-xl border border-[#ededed] bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#262626]">
            After registration
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#a3a3a3] hover:text-[#262626] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="rounded-lg border border-[#fa5d19]/20 bg-[#fa5d19]/5 p-3.5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#fa5d19]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Copy your signing secret now</span>
          </div>
          <p className="text-xs text-[#737373] pl-6">
            It will not be shown again.
          </p>
        </div>

        {/* Signing Secret Box */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#737373]">
            Signing secret
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={secret}
              className="w-full rounded-lg border border-[#ededed] bg-[#f9f9f9] py-2 pl-3 pr-9 font-mono text-xs text-[#262626] focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="absolute right-2.5 top-2 text-[#737373] hover:text-[#262626]"
            >
              {copied ? (
                <Check className="h-4 w-4 text-[#fa5d19]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-[#a3a3a3]">
            Illustrative secret only. HMAC signing format depends on the delivery
            contract.
          </p>
        </div>

        {/* Done Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-full rounded-lg bg-[#fa5d19] py-2 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors"
          >
            I have stored the secret
          </button>
        </div>
      </div>
    </div>
  );
}
