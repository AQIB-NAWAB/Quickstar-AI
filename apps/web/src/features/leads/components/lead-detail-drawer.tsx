"use client";

import { Check,ChevronDown,Mail,Phone,X } from "lucide-react";
import { useState } from "react";
import { formatFullUtcCaptured,getInitials,isValidEmail,isValidPhone } from "../lib/format";
import type { LeadDetail,LeadStatus } from "../lib/types";
import { CapturedFields } from "./captured-fields";
import { LeadConversationTranscript } from "./lead-conversation-transcript";
import { QualificationIndicator } from "./qualification-indicator";
import { SentimentLabel } from "./sentiment-label";

interface LeadDetailDrawerProps {
  lead: LeadDetail;
  workspaceId?: string;
  isPreview?: boolean;
  isOutsideFilter?: boolean;
  onClose: () => void;
  onUpdateStatus?: (newStatus: LeadStatus) => Promise<void> | void;
}

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "qualified", "disqualified"];

export function LeadDetailDrawer({
  lead,
  workspaceId,
  isPreview = false,
  isOutsideFilter = false,
  onClose,
  onUpdateStatus,
}: LeadDetailDrawerProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  async function handleSelectStatus(status: LeadStatus) {
    setStatusMenuOpen(false);
    if (status === lead.status) return;

    setIsUpdatingStatus(true);
    setStatusNotification(null);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(status);
      }
      if (isPreview) {
        setStatusNotification("Preview change only. Not persisted.");
      }
    } catch (err: unknown) {
      setStatusNotification((err instanceof Error ? err.message : null) || "Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const initials = getInitials(lead.name);
  const displayId = lead.id;
  const displayName = lead.name || lead.email || lead.phone || "Unnamed lead";

  return (
    <aside
      className="w-full lg:w-[360px] 2xl:w-[400px] bg-white border-l border-border-faint flex flex-col h-full shadow-xs shrink-0"
      aria-label="Lead details panel"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-faint">
        <h3 className="text-sm font-bold text-accent-black tracking-tight">
          Lead details
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-700 rounded-6 hover:bg-neutral-100 transition-colors"
          title="Close details"
          aria-label="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Outside filter warning if preserved across filter changes */}
      {isOutsideFilter && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-[11px] text-amber-800">
          This lead is outside the currently applied search or filters.
        </div>
      )}

      {/* Ephemeral status notification */}
      {statusNotification && (
        <div className="bg-neutral-100 border-b border-neutral-200 px-5 py-2 text-[11px] text-neutral-700 flex items-center justify-between">
          <span>{statusNotification}</span>
          <button
            type="button"
            onClick={() => setStatusNotification(null)}
            className="text-neutral-400 hover:text-neutral-700 ml-2 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Scrollable Drawer Body */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {/* Lead Identity & Status Selector */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-600 font-bold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div>
              <h4 className="text-base font-bold text-accent-black leading-tight">
                {displayName}
              </h4>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">
                {displayId}
              </p>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <span className="text-[10px] text-neutral-400 font-medium block text-right mb-0.5">
              Status
            </span>
            <button
              type="button"
              onClick={() => setStatusMenuOpen((o) => !o)}
              disabled={isUpdatingStatus}
              className={`px-3 py-1 rounded-6 text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                lead.status === "qualified"
                  ? "border-orange-300 bg-orange-50/70 text-heat-100"
                  : lead.status === "disqualified"
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <span className="capitalize">{lead.status}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {/* Custom Status Options Dropdown Menu */}
            {statusMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-border-faint rounded-8 shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = opt === lead.status;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectStatus(opt)}
                      className={`w-full px-3 py-1.5 text-left text-xs capitalize flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-heat-100 text-white font-semibold"
                          : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Contact */}
        <div className="space-y-2 pt-2 border-t border-border-faint">
          <h5 className="text-[11px] font-semibold text-neutral-400 ">
            Contact
          </h5>
          <div className="space-y-1.5 text-xs">
            {lead.email ? (
              <div className="flex items-center gap-2 text-neutral-700">
                <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                {isValidEmail(lead.email) ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-heat-100 hover:underline"
                  >
                    {lead.email}
                  </a>
                ) : (
                  <span>{lead.email}</span>
                )}
              </div>
            ) : null}

            {lead.phone ? (
              <div className="flex items-center gap-2 text-neutral-700 font-mono">
                <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                {isValidPhone(lead.phone) ? (
                  <a
                    href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                    className="hover:text-heat-100"
                  >
                    {lead.phone}
                  </a>
                ) : (
                  <span>{lead.phone}</span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Section 2: Qualification and Sentiment Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border-faint">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400  block">
              Qualification
            </span>
            <QualificationIndicator
              score={lead.qualificationScore}
              max={lead.qualificationMax}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-neutral-400  block">
              Sentiment
            </span>
            <SentimentLabel sentiment={lead.sentiment} />
          </div>
        </div>

        {/* Section 3: Extracted intent */}
        <div className="space-y-1 pt-2 border-t border-border-faint">
          <h5 className="text-[11px] font-semibold text-neutral-400 ">
            Extracted intent
          </h5>
          <p className="text-xs font-bold text-accent-black">
            {lead.intent || "—"}
          </p>
        </div>

        {/* Section 4: Tags */}
        <div className="space-y-1.5 pt-2 border-t border-border-faint">
          <h5 className="text-[11px] font-semibold text-neutral-400 ">
            Tags
          </h5>
          {lead.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {lead.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded text-[11px] bg-neutral-100 text-neutral-600 border border-neutral-200"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">No tags assigned</p>
          )}
        </div>

        {/* Section 5: Captured fields (labels from workspace lead_schema) */}
        <CapturedFields fields={lead.capturedFields} labels={lead.attributeLabels} />

        {/* Section 6: Originating conversation */}
        <LeadConversationTranscript
          conversationId={lead.originatingConversationId}
          workspaceId={workspaceId}
          status={lead.transcriptStatus}
          messages={lead.transcriptMessages}
        />

        {/* Section 7: Footer Timestamp */}
        <div className="pt-4 border-t border-border-faint text-[11px] font-mono text-neutral-400">
          {formatFullUtcCaptured(lead.capturedAt)}
        </div>
      </div>
    </aside>
  );
}
