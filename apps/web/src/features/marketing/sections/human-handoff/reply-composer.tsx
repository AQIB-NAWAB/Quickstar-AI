"use client";

import React, { useRef } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import type {
  AttachmentPreview,
  HandoffOwnership,
} from "../../lib/use-handoff-playback";

interface ReplyComposerProps {
  ownership: HandoffOwnership;
  draftText: string;
  onDraftChange: (text: string) => void;
  attachment: AttachmentPreview | null;
  onSelectAttachment: (file: { name: string }) => void;
  onRemoveAttachment: () => void;
  onHandBack: () => void;
  onSendReply: (text: string) => void;
}

export function ReplyComposer({
  ownership,
  draftText,
  onDraftChange,
  attachment,
  onSelectAttachment,
  onRemoveAttachment,
  onHandBack,
  onSendReply,
}: ReplyComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAgent = ownership === "agent";
  const canSend = !isAgent && draftText.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter sends reply
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSend) {
        onSendReply(draftText);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onSelectAttachment({ name: files[0].name });
      // Clear input value so selecting the same file again triggers change
      e.target.value = "";
    }
  };

  const triggerFilePicker = () => {
    if (isAgent) return;
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSend) {
      onSendReply(draftText);
    }
  };

  return (
    <div
      className={`marketing-handoff-composer ${
        isAgent ? "marketing-handoff-composer-disabled" : ""
      }`}
    >
      <form onSubmit={handleSubmit} className="marketing-handoff-composer-form">
        <label htmlFor="marketing-handoff-textarea" className="sr-only">
          Write a reply to the customer
        </label>

        {/* Attachment Chip Preview (if selected) */}
        {attachment && (
          <div className="marketing-handoff-attachment-chip">
            <Paperclip
              size={12}
              className="marketing-handoff-attachment-chip-icon"
              aria-hidden="true"
            />
            <span className="marketing-handoff-attachment-filename">
              {attachment.name}
            </span>
            <button
              type="button"
              onClick={onRemoveAttachment}
              className="marketing-handoff-attachment-remove"
              aria-label="Remove attached file"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        )}

        <textarea
          id="marketing-handoff-textarea"
          value={draftText}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isAgent}
          placeholder={
            isAgent
              ? "Switch to Your team to reply…"
              : "Write a reply…"
          }
          rows={3}
          className="marketing-handoff-textarea"
        />

        {/* Hidden File Picker Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          onChange={handleFileInputChange}
          disabled={isAgent}
          aria-hidden="true"
        />

        {/* Toolbar */}
        <div className="marketing-handoff-toolbar">
          <div className="marketing-handoff-toolbar-left">
            <button
              type="button"
              onClick={triggerFilePicker}
              disabled={isAgent}
              className="marketing-handoff-attach-btn"
              aria-label="Attach a file"
              title="Attach a file"
            >
              <Paperclip size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="marketing-handoff-toolbar-right">
            {/* Hand back to agent button */}
            <button
              type="button"
              onClick={onHandBack}
              disabled={isAgent}
              className="marketing-handoff-handback-btn"
            >
              <BrandLogo size={14} fillColor="#fa5d19" />
              <span>Hand back to agent</span>
            </button>

            {/* Send reply button */}
            <button
              type="submit"
              disabled={!canSend}
              className="marketing-handoff-send-btn"
              aria-label="Send reply"
            >
              <Send size={15} className="marketing-handoff-send-icon" aria-hidden="true" />
              <span>Send reply</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
