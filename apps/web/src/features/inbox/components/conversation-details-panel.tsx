"use client";

import { useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  FileText,
  MessageSquare,
  User,
  X,
} from "lucide-react";
import type { Conversation } from "@/features/inbox/lib/types";
import {
  conversationRef,
  conversationTitle,
  visitorIdentity,
} from "@/features/inbox/lib/types";

type Props = {
  conversation: Conversation;
  agentName?: string;
  summary: string | null;
  summaryState: "idle" | "loading" | "ready" | "waiting";
  onClose: () => void;
};

export function ConversationDetailsPanel({
  conversation,
  agentName = "Support agent",
  summary,
  summaryState,
  onClose,
}: Props) {
  const [copiedRef, setCopiedRef] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  const title = conversationTitle(conversation);
  const identity = visitorIdentity(conversation);
  const shortRef = conversationRef(conversation);

  async function handleCopyRef() {
    try {
      await navigator.clipboard.writeText(conversation.id);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      setCopiedRef(false);
    }
  }

  // Format started date
  const startedDate = new Date(conversation.created_at);
  const formattedStarted = !isNaN(startedDate.getTime())
    ? startedDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " · " +
      startedDate.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  // Relative updated time
  function formatRelative(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (isNaN(diffMs)) return "—";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  return (
    <aside
      aria-label="Conversation details"
      className="w-full shrink-0 border-l border-[#E3E6EA] bg-white flex flex-col min-h-0 h-full overflow-hidden"
    >
      {/* Header matching Image 2 */}
      <div className="p-5 pb-4 border-b border-[#EDF0F2] flex items-center justify-between shrink-0">
        <h2 className="text-[18px] font-semibold text-[#202125]">Conversation details</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close conversation details"
          className="p-2 rounded-md text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[14px]">
        {/* Section A: Summary */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#667085]" />
            <h3 className="font-semibold text-[14px] text-[#202125]">Summary</h3>
          </div>
          <div className="p-3.5 rounded-[8px] bg-[#F8F9FA] text-[14px] leading-relaxed text-[#475467]">
            {summaryState === "ready" && summary ? (
              <p>{summary}</p>
            ) : summaryState === "loading" ? (
              <p className="text-[#667085]">Writing a summary of this conversation...</p>
            ) : (
              <p className="text-[#667085]">
                No summary available yet.
              </p>
            )}
          </div>
        </section>

        <hr className="border-[#EDF0F2]" />

        {/* Section B: Conversation Info */}
        <section className="space-y-3">
          <h3 className="font-semibold text-[14px] text-[#202125]">Conversation</h3>

          <div className="space-y-2.5">
            {/* Status */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[#667085]">Status</span>
              <div className="flex items-center gap-1.5 text-[#202125] font-medium">
                {conversation.state === "bot" ? (
                  <>
                    <Bot className="w-4 h-4 text-[#667085]" />
                    <span>Bot handling</span>
                  </>
                ) : conversation.state === "waiting" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#F79009]" />
                    <span>Waiting for human</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-[#15803D]" />
                    <span>Human handling</span>
                  </>
                )}
              </div>
            </div>

            {/* Channel */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[#667085]">Channel</span>
              <div className="flex items-center gap-1.5 text-[#202125] font-medium">
                <MessageSquare className="w-4 h-4 text-[#667085]" />
                <span>Website chat</span>
              </div>
            </div>

            {/* Agent */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[#667085]">Agent</span>
              <span className="text-[#202125] font-medium break-words">{agentName}</span>
            </div>

            {/* Assignee */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[#667085]">Assignee</span>
              <span className="text-[#202125] font-medium">
                {conversation.assignee_user_id ? "Assigned" : "Unassigned"}
              </span>
            </div>

            {/* Reference */}
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[#667085]">Reference</span>
              <div className="flex items-center gap-2 font-mono text-[12px] text-[#202125]">
                <span>{shortRef}</span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  title="Copy full reference ID"
                  aria-label="Copy full reference ID"
                  className="p-1 rounded text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] transition-colors"
                >
                  {copiedRef ? (
                    <Check className="w-3.5 h-3.5 text-[#15803D]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-[#EDF0F2]" />

        {/* Section C: Visitor Info */}
        <section className="space-y-3">
          <h3 className="font-semibold text-[14px] text-[#202125]">Visitor</h3>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E4E7EC] text-[#667085] flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#202125] text-[14px] leading-tight truncate">
                {title}
              </p>
              <p className="text-[14px] text-[#667085] mt-1 break-words">
                {identity?.email || "No contact information available."}
              </p>
            </div>
          </div>
        </section>

        <hr className="border-[#EDF0F2]" />

        {/* Section D: Activity */}
        <section className="space-y-3">
          <h3 className="font-semibold text-[14px] text-[#202125]">Activity</h3>

          <div className="space-y-2">
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[#667085]">Started</span>
              <span className="text-[#202125]">{formattedStarted}</span>
            </div>
            <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-2">
              <span className="text-[#667085]">Last updated</span>
              <span className="text-[#202125]">{formatRelative(conversation.updated_at)}</span>
            </div>
          </div>
        </section>

        <hr className="border-[#EDF0F2]" />

        {/* Section E: Technical details disclosure */}
        <section>
          <button
            type="button"
            aria-expanded={techOpen}
            onClick={() => setTechOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left text-[#667085] hover:text-[#202125] transition-colors py-1"
          >
            <span className="text-[14px] font-medium">Technical details</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${techOpen ? "rotate-180" : ""}`}
            />
          </button>

          {techOpen && (
            <div className="mt-3 p-3 rounded-[6px] bg-[#F8F9FA] border border-[#E3E6EA] font-mono text-[12px] space-y-2 text-[#475467] break-all">
              <div>
                <span className="text-[#667085] block">Conversation ID:</span>
                <span className="text-[#202125]">{conversation.id}</span>
              </div>
              <div>
                <span className="text-[#667085] block">Sequence Number:</span>
                <span className="text-[#202125]">{conversation.last_seq}</span>
              </div>
              {conversation.agent_id && (
                <div>
                  <span className="text-[#667085] block">Agent ID:</span>
                  <span className="text-[#202125]">{conversation.agent_id}</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
