"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import type { Agent } from "../lib/types";
import { createTestConversation, executeTestTurn } from "../lib/client";

type Props = {
  workspaceId: string;
  agent: Agent;
  releaseNumber?: number;
  isDrawer?: boolean;
  isInline?: boolean;
  isOpen?: boolean;
  onCloseDrawer?: () => void;
  onCollapseInline?: () => void;
  onClose?: () => void;
  isCollapsedInline?: boolean;
};

type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
};

export function TestAgentPanel({
  workspaceId,
  agent,
  releaseNumber,
  isDrawer,
  isInline,
  isOpen = true,
  onCloseDrawer,
  onCollapseInline,
  onClose,
  isCollapsedInline = false,
}: Props) {
  // Determine drawer vs inline mode
  const effectiveIsDrawer = typeof isDrawer === "boolean" ? isDrawer : !isInline;
  const handleClose = onClose || onCloseDrawer || onCollapseInline;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeSessionRef = useRef<string | null>(null);

  const isPublished = Boolean(agent.production_version_id);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messages.length) messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isSending]);

  // Reset conversation session
  function handleReset() {
    activeSessionRef.current = null;
    setConversationId(null);
    setMessages([]);
    setError(null);
    setInput("");
  }

  // Suggestion click populates composer without auto-submitting
  function handleSuggestionClick(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending || !isPublished) return;

    setError(null);
    setInput("");

    // Create conversation lazily if not yet initialized
    let currentConvId = conversationId;
    if (!currentConvId) {
      try {
        const initRes = await createTestConversation(workspaceId, agent.id);
        if (initRes.error || !initRes.conversationId) {
          setError(initRes.error?.message || "Could not start test conversation.");
          setInput(text);
          return;
        }
        currentConvId = initRes.conversationId;
        setConversationId(currentConvId);
        activeSessionRef.current = currentConvId;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize test conversation.");
        setInput(text);
        return;
      }
    }

    const sessionId = currentConvId;
    activeSessionRef.current = sessionId;

    const userMsgId = `u-${Date.now()}`;
    const assistantMsgId = `a-${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text, timestamp: nowTime },
      { id: assistantMsgId, sender: "assistant", text: "", timestamp: nowTime },
    ]);

    setIsSending(true);

    try {
      const turnRes = await executeTestTurn(workspaceId, sessionId, text, (delta) => {
        // Discard late tokens if conversation was reset
        if (activeSessionRef.current !== sessionId) return;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, text: msg.text + delta } : msg,
          ),
        );
      });

      if (activeSessionRef.current !== sessionId) return;

      if (turnRes.error) {
        setError(turnRes.error.message || "Failed to get assistant response.");
      } else if (turnRes.assistantText) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, text: msg.text || turnRes.assistantText || "" }
              : msg,
          ),
        );
      }
    } catch (err) {
      if (activeSessionRef.current === sessionId) {
        setError(err instanceof Error ? err.message : "Turn request failed.");
      }
    } finally {
      if (activeSessionRef.current === sessionId) {
        setIsSending(false);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (effectiveIsDrawer && !isOpen) return null;

  const content = (
    <div className={`flex flex-col ${effectiveIsDrawer ? "h-full" : "min-h-[640px]"} bg-white border border-[#E1E5EA] rounded-[8px] overflow-hidden shadow-sm`}>
      {/* Panel Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#EDF0F2]">
        <h2 className="text-[18px] font-semibold text-[#202125]">Test agent</h2>
        <div className="flex items-center gap-1">
          {effectiveIsDrawer ? (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close drawer"
              className="p-1 text-[#667085] hover:text-[#202125] rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            handleClose && (
              <button
                type="button"
                onClick={handleClose}
                aria-label="Collapse test panel"
                className="p-1 text-[#667085] hover:text-[#202125] rounded transition-colors"
              >
                {isCollapsedInline ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            )
          )}
        </div>
      </div>

      {/* Release indicator strip */}
      <div className="px-5 pt-4 pb-2 bg-white flex items-center justify-between text-[13px]">
        {isPublished ? (
          <div className="flex items-center gap-1.5 font-medium text-[#202125]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
            <span>
              {releaseNumber ? `Testing Release #${releaseNumber}` : "Testing published agent"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[#B54708] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#F79009]" aria-hidden="true" />
            <span>Unpublished</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          title="Reset conversation"
          className="inline-flex items-center gap-1 text-[#475467] hover:text-[#202125] font-medium border border-[#E1E5EA] px-2 py-1 rounded bg-white hover:bg-[#F8F9FA] transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="px-5 pt-0 pb-3 bg-white text-[12px] text-[#667085]">
        {isPublished
          ? "Tests use your published agent. Draft edits aren't included."
          : "Publish a release before testing this agent."}
      </div>

      {/* Messages Viewport */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[300px] flex flex-col">
        {messages.length === 0 ? (
          /* Empty State matching 3.png */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
            <div className="w-10 h-10 text-[#344054] flex items-center justify-center mb-3">
              <MessageSquare className="w-9 h-9 stroke-[1.5]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[#202125]">Try a conversation</h3>
            <p className="mt-1 text-[13px] text-[#667085] max-w-[240px]">
              {isPublished
                ? "Ask a question to see how your live agent responds."
                : "Publish this agent to start testing conversations."}
            </p>

            {isPublished && (
              <div className="mt-5 space-y-2 w-full max-w-[250px]">
                <button
                  type="button"
                  onClick={() => handleSuggestionClick("What can you help with?")}
                  className="w-full text-center px-3 py-1.5 text-[13px] font-medium text-[#344054] bg-white border border-[#E1E5EA] rounded-md hover:bg-[#F8F9FA] hover:border-[#CCD2D8] transition-colors"
                >
                  What can you help with?
                </button>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick("How do I add the widget?")}
                  className="w-full text-center px-3 py-1.5 text-[13px] font-medium text-[#344054] bg-white border border-[#E1E5EA] rounded-md hover:bg-[#F8F9FA] hover:border-[#CCD2D8] transition-colors"
                >
                  How do I add the widget?
                </button>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-[14px] leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#202125] text-white"
                    : "bg-[#F8F9FA] border border-[#E1E5EA] text-[#202125]"
                }`}
              >
                {msg.text || (isSending && msg.sender === "assistant" ? (
                  <span className="inline-flex items-center gap-1 text-[#667085]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#667085] animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#667085] animate-pulse delay-75" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#667085] animate-pulse delay-150" />
                  </span>
                ) : null)}
              </div>
              <span className="text-[11px] text-[#7A808A] mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-[12px] text-[#B42318] border-t border-red-200">
          {error}
        </div>
      )}

      {/* Composer */}
      <div className="p-5 bg-white">
        <div className="relative border border-[#E1E5EA] rounded-lg focus-within:border-[#F15A24] focus-within:ring-1 focus-within:ring-[#F15A24] transition-all bg-white">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isPublished || isSending}
            placeholder={isPublished ? "Message your agent..." : "Publish to enable testing..."}
            className="w-full resize-none p-2.5 pr-11 text-[14px] text-[#202125] bg-transparent focus:outline-none placeholder-[#98A2B3] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isSending || !isPublished}
            aria-label="Send message"
            className="absolute right-2 bottom-2 p-1.5 rounded-md bg-[#202125] text-white hover:bg-black disabled:opacity-30 disabled:hover:bg-[#202125] transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Truthful copy per specification */}
        <p className="mt-2 text-[12px] text-[#7A808A] text-left">
          Uses published settings. Connected tools may run.
        </p>
      </div>
    </div>
  );

  if (effectiveIsDrawer) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] animate-in fade-in"
      >
        <div className="w-full max-w-[420px] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-200 p-3">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
