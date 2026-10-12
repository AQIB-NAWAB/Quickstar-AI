"use client";

import { Info,X } from "lucide-react";
import React,{ useState } from "react";
import type { EmailActionConfig } from "../../lib/types";

interface EmailActionFormProps {
  config: EmailActionConfig;
  onChange: (updated: EmailActionConfig) => void;
}

export function EmailActionForm({ config, onChange }: EmailActionFormProps) {
  const [emailInput, setEmailInput] = useState("");

  function handleAddEmail(val: string) {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;
    if (config.recipients.includes(trimmed)) {
      setEmailInput("");
      return;
    }
    onChange({
      ...config,
      recipients: [...config.recipients, trimmed],
    });
    setEmailInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      handleAddEmail(emailInput);
    }
  }

  function handleRemoveEmail(emailToRemove: string) {
    onChange({
      ...config,
      recipients: config.recipients.filter((r) => r !== emailToRemove),
    });
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Notice */}
      <div className="p-2.5 rounded-8 bg-neutral-50 border border-border-faint text-[11px] text-neutral-500 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
        <span>Email delivery requires a configured notification provider.</span>
      </div>


      {/* Recipients */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Recipients (press Enter to add)
        </label>
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-8 border border-neutral-300 bg-white min-h-[42px] focus-within:border-heat-100 focus-within:ring-1 focus-within:ring-heat-100">
          {config.recipients.map((rec) => (
            <span
              key={rec}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
            >
              <span>{rec}</span>
              <button
                type="button"
                onClick={() => handleRemoveEmail(rec)}
                className="text-neutral-400 hover:text-neutral-700 p-0.5"
                aria-label={`Remove email ${rec}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => handleAddEmail(emailInput)}
            placeholder={config.recipients.length === 0 ? "team@example.com" : ""}
            className="flex-1 min-w-[120px] bg-transparent text-xs text-accent-black focus:outline-none"
          />
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Subject line
        </label>
        <input
          type="text"
          value={config.subject}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
          placeholder="Urgent: Payment escalation for conversation {{event.conversation_id}}"
          className="w-full px-3 py-1.5 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        />
      </div>

      {/* Body */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Message body
        </label>
        <textarea
          rows={4}
          value={config.body}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          placeholder="A customer reported a payment failure: {{event.message.text}}"
          className="w-full px-3 py-2 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        />
      </div>
    </div>
  );
}
