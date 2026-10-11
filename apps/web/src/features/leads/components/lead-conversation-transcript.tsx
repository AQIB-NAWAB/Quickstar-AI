import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { TranscriptMessage } from "../lib/types";

interface LeadConversationTranscriptProps {
  conversationId: string | null;
  workspaceId?: string;
  status: "ready" | "unavailable" | "empty" | "error";
  messages: TranscriptMessage[];
  dateHeader?: string;
}

export function LeadConversationTranscript({
  conversationId,
  workspaceId,
  status,
  messages,
  dateHeader = "Oct 10, 14:18 UTC",
}: LeadConversationTranscriptProps) {
  if (!conversationId) {
    return (
      <div className="space-y-2 pt-2 border-t border-border-faint">
        <h4 className="text-[11px] font-semibold text-neutral-400 ">
          Originating conversation
        </h4>
        <p className="text-xs text-neutral-400 italic">No conversation linked</p>
      </div>
    );
  }

  const inboxLink = workspaceId
    ? `/workspaces/${encodeURIComponent(workspaceId)}/inbox?conversation=${encodeURIComponent(conversationId)}`
    : "#";

  return (
    <div className="space-y-3 pt-3 border-t border-border-faint">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-neutral-500 ">
            Originating conversation
          </span>
          <span className="text-xs font-mono font-medium text-accent-black">
            {conversationId}
          </span>
        </div>
        <Link
          href={inboxLink}
          className="p-1 text-neutral-400 hover:text-heat-100 rounded transition-colors"
          title="Open conversation in Inbox"
          aria-label="Open conversation"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border-faint flex items-center gap-4 text-xs">
        <span className="pb-1.5 border-b-2 border-heat-100 font-semibold text-heat-100 cursor-default">
          Conversation
        </span>
      </div>

      {/* Date header */}
      {dateHeader && (
        <p className="text-[11px] font-mono text-neutral-400">{dateHeader}</p>
      )}

      {/* Status states or Messages */}
      {status === "unavailable" ? (
        <p className="text-xs text-neutral-400 italic py-2">
          Conversation transcript unavailable.
        </p>
      ) : status === "empty" || messages.length === 0 ? (
        <p className="text-xs text-neutral-400 italic py-2">
          Empty conversation transcript.
        </p>
      ) : status === "error" ? (
        <p className="text-xs text-red-600 italic py-2">
          Failed to load transcript.
        </p>
      ) : (
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {messages.map((msg) => {
            const isAgent = msg.speaker === "agent";
            const isUser = msg.speaker === "user";

            return (
              <div
                key={msg.id}
                className="flex items-start gap-2 text-xs leading-relaxed"
              >
                <span className="text-[10px] font-mono text-neutral-400 shrink-0 w-8 text-right mt-0.5">
                  {msg.timestamp}
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 uppercase tracking-tight ${
                    isAgent
                      ? "bg-orange-100 text-heat-100"
                      : isUser
                        ? "bg-neutral-100 text-neutral-600"
                        : "bg-neutral-100 text-neutral-400"
                  }`}
                >
                  {isAgent ? "Agent" : isUser ? "User" : "System"}
                </span>

                <p className="text-neutral-700 min-w-0 flex-1 break-words">
                  {msg.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
