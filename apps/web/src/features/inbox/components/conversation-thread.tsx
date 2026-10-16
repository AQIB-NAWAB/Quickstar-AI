"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  FileText,
  Phone,
  Send,
  Sidebar,
  User,
} from "lucide-react";
import {
  getConversation,
  releaseConversation,
  leaveWidgetCall,
  sendHumanMessage,
  summarizeConversation,
  takeConversation,
} from "@/features/inbox/lib/client";
import type { Conversation, ConversationState, Message } from "@/features/inbox/lib/types";
import { conversationRef, conversationTitle } from "@/features/inbox/lib/types";
import { useMessages } from "@/features/inbox/hooks/use-messages";
import { LiveCallWave, useStaffLiveCall } from "./live-call-panel";
import { ConversationDetailsPanel } from "./conversation-details-panel";
import { getAgent } from "@/features/agents/lib/client";

type Props = {
  workspaceId: string;
  conversationId: string;
  userId: string;
  agentName: string;
};

function canTake(state: ConversationState): boolean {
  return state === "bot" || state === "waiting";
}

function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "Today";
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  if (isToday) {
    return `Today, ${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
  }
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function ConversationThread({ workspaceId, conversationId, userId }: Props) {
  const [botName, setBotName] = useState("Support agent");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<"idle" | "loading" | "ready" | "waiting">("idle");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const followMessagesRef = useRef(true);
  const detailsTriggerRef = useRef<HTMLButtonElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    loading,
    loadingEarlier,
    error: messagesError,
    canLoadEarlier,
    loadEarlier,
    appendLocal,
  } = useMessages(workspaceId, conversationId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const history = historyRef.current;
    if (history && followMessagesRef.current && !loadingEarlier) {
      history.scrollTop = history.scrollHeight;
    }
  }, [messages.length, loadingEarlier]);

  // Close details panel on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && detailsOpen) {
        setDetailsOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailsOpen]);

  // The details column becomes a modal drawer when the center would be too narrow.
  useEffect(() => {
    if (!detailsOpen) return;
    const media = window.matchMedia("(max-width: 1599px)");
    const panel = detailsRef.current;
    if (!panel) return;
    const trigger = detailsTriggerRef.current;
    function syncMode() {
      if (!panel) return;
      if (media.matches) {
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", "Conversation details");
        panel.querySelector<HTMLButtonElement>("button")?.focus();
      } else {
        panel.removeAttribute("role");
        panel.removeAttribute("aria-modal");
      }
    }
    function trapFocus(event: KeyboardEvent) {
      if (!media.matches || event.key !== "Tab" || !panel) return;
      const controls = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]',
      )).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
    syncMode();
    media.addEventListener("change", syncMode);
    document.addEventListener("keydown", trapFocus);
    return () => {
      media.removeEventListener("change", syncMode);
      document.removeEventListener("keydown", trapFocus);
      if (media.matches) trigger?.focus();
    };
  }, [detailsOpen]);

  const agentId = conversation?.agent_id;
  useEffect(() => {
    let cancelled = false;
    setBotName("Support agent");
    if (agentId) {
      void getAgent(workspaceId, agentId).then((result) => {
        if (!cancelled && result.agent) setBotName(result.agent.name);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [workspaceId, agentId]);

  const syncConversation = useCallback(async () => {
    const { conversation: c, error } = await getConversation(workspaceId, conversationId);
    if (error) {
      setMetaError(error.message);
      return;
    }
    setMetaError(null);
    setConversation(c ?? null);
  }, [workspaceId, conversationId]);

  useEffect(() => {
    void syncConversation();
  }, [syncConversation]);

  const lastSeq = conversation?.last_seq ?? 0;
  useEffect(() => {
    if (!conversation || messages.length < 2) {
      setSummary(null);
      setSummaryState(messages.length > 0 ? "waiting" : "idle");
      return;
    }
    let cancelled = false;
    setSummaryState("loading");
    void summarizeConversation(workspaceId, conversationId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setSummaryState("waiting");
        return;
      }
      if (!result.ready || !result.summary) {
        setSummary(null);
        setSummaryState("waiting");
        return;
      }
      setSummary(result.summary);
      setSummaryState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, conversationId, Boolean(conversation), messages.length, lastSeq]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void syncConversation();
    }, 20_000);
    return () => window.clearInterval(id);
  }, [syncConversation]);

  async function onTake() {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    const { conversation: c, error } = await takeConversation(workspaceId, conversationId);
    setActionBusy(false);
    if (error) {
      setActionError(
        error.code === "CONFLICT" || error.message.toLowerCase().includes("conflict")
          ? "Another teammate took this conversation first."
          : error.message,
      );
      void syncConversation();
      return;
    }
    if (c) {
      setConversation(c);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function onRelease() {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    const { conversation: c, error } = await releaseConversation(workspaceId, conversationId);
    setActionBusy(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    if (c) {
      setConversation(c);
    }
    await leaveWidgetCall(workspaceId, conversationId);
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !canSendHuman || sendBusy) {
      return;
    }
    setSendBusy(true);
    setActionError(null);
    const key = `web-human-${crypto.randomUUID()}`;
    const { message, error } = await sendHumanMessage(workspaceId, conversationId, text, key);
    setSendBusy(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    if (message) {
      appendLocal(message);
      setDraft("");
    }
  }

  const state = conversation?.state ?? "bot";
  const canSendHuman = state === "human" && conversation?.assignee_user_id === userId;
  const title = conversation ? conversationTitle(conversation) : "Website visitor";
  const shortRef = conversation ? conversationRef(conversation) : "";

  const live = useStaffLiveCall({
    workspaceId,
    conversationId,
    agentName: botName,
    state,
    onConversation: setConversation,
  });

  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-[#FAFBFC]">
      {/* Center Conversation Column */}
      <div className="inbox-conversation flex flex-col flex-1 min-w-0 min-h-0 bg-[#FAFBFC]">
        {/* Header matching Images 1 & 2 */}
        <header className="inbox-thread-header min-h-20 shrink-0 border-b border-[#E3E6EA] bg-white px-5 py-4 flex items-center justify-between gap-3">
          {/* Left: Visitor Avatar, Name & Channel */}
          <div className="flex items-center gap-3.5 min-w-0">
            <Link
              href={
                workspaceId === "local-preview"
                  ? "/preview/inbox"
                  : `/workspaces/${workspaceId}/inbox`
              }
              aria-label="Back to inbox"
              className="md:hidden p-1.5 -ml-2 rounded-md text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] transition-colors shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>

            <div className="w-10 h-10 rounded-full bg-[#E4E7EC] text-[#667085] flex items-center justify-center shrink-0">
              <User className="w-5 h-5 stroke-[2]" />
            </div>

            <div className="min-w-0">
              <h1 className="text-[18px] font-semibold text-[#202125] truncate leading-tight">
                {title}
              </h1>
              <p className="text-[14px] text-[#667085] mt-0.5 truncate leading-tight">
                Website chat · <span className="font-mono">{shortRef}</span>
              </p>
            </div>
          </div>

          {/* Right: Bot Ownership indicator, Take chat, Details, Transcript */}
          <div className="inbox-header-actions flex items-center gap-2 shrink-0">
            {/* Ownership State indicator */}
            <div className="inbox-ownership hidden sm:flex items-center gap-2 text-[14px] text-[#667085]">
              {state === "bot" ? (
                <>
                  <Bot className="w-4 h-4 text-[#667085]" />
                  <span>Bot handling</span>
                  <span className="w-2 h-2 rounded-full bg-[#F15A24]" />
                </>
              ) : state === "waiting" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#F79009]" />
                  <span>Waiting</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-[#15803D]" />
                  <span>Human handling</span>
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                </>
              )}
            </div>

            {/* Live call join button if active */}
            {live.call && !live.joined && (
              <button
                type="button"
                disabled={live.busy}
                onClick={() => void live.join()}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[6px] border border-[#22C55E] bg-[#22C55E]/10 text-[14px] font-semibold text-[#15803D] hover:bg-[#22C55E]/20 transition-colors"
              >
                <Phone className="w-4 h-4 text-[#15803D]" />
                {live.busy ? "Joining..." : "Join call"}
              </button>
            )}

            {/* Primary Action Button */}
            {canTake(state) ? (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void onTake()}
                className="inline-flex items-center justify-center h-10 px-4 rounded-[6px] bg-[#F15A24] text-white text-[14px] font-medium hover:bg-[#C94716] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionBusy ? "Taking..." : "Take chat"}
              </button>
            ) : canSendHuman ? (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void onRelease()}
                className="inline-flex items-center justify-center h-10 px-4 rounded-[6px] bg-white border border-[#E3E6EA] text-[#202125] text-[14px] font-medium hover:bg-[#F8F9FA] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionBusy ? "Releasing..." : "Release to bot"}
              </button>
            ) : null}

            {/* Details Toggle Button matching Images 1 & 2 */}
            <button
              type="button"
              ref={detailsTriggerRef}
              aria-label="Conversation details"
              aria-controls="inbox-conversation-details"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[6px] border text-[14px] font-medium transition-colors ${
                detailsOpen
                  ? "bg-[#F8F9FA] border-[#CCD2D8] text-[#202125]"
                  : "bg-white border-[#E3E6EA] text-[#202125] hover:bg-[#F8F9FA]"
              }`}
            >
              <Sidebar className="w-4 h-4 text-[#667085]" />
              <span className="inbox-action-label">Details</span>
            </button>

            {/* Transcript Button matching Images 1 & 2 */}
            <Link
              href={
                workspaceId === "local-preview"
                  ? `/preview/inbox/${conversationId}/transcript`
                  : `/workspaces/${workspaceId}/inbox/${conversationId}/transcript`
              }
              aria-label="View transcript"
              title="View transcript"
              className="inline-flex items-center gap-1.5 h-10 px-2 rounded-[6px] text-[#667085] text-[14px] font-medium hover:bg-[#F8F9FA] transition-colors"
            >
              <FileText className="w-4 h-4 text-[#667085]" />
              <span className="inbox-action-label">Transcript</span>
            </Link>
          </div>
        </header>

        {/* Action / Live Error Banner */}
        {(metaError || messagesError || actionError || live.error) && (
          <div className="shrink-0 px-6 py-2 bg-red-50 text-[12px] text-[#B42318] border-b border-red-200 flex items-center justify-between">
            <span>{actionError ?? live.error ?? metaError ?? messagesError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="underline text-[12px] ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Message History Viewport */}
        <div
          ref={historyRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            followMessagesRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-5"
        >
          {canLoadEarlier && (
            <div className="flex justify-center pb-2">
              <button
                type="button"
                disabled={loadingEarlier}
                onClick={() => void loadEarlier()}
                className="px-3.5 py-1.5 rounded-full border border-[#E3E6EA] bg-white text-[12px] font-medium text-[#667085] hover:bg-[#F8F9FA] transition-colors"
              >
                {loadingEarlier ? "Loading earlier..." : "Load earlier messages"}
              </button>
            </div>
          )}

          {loading && messages.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-[#667085]">Loading conversation...</div>
          ) : null}

          {!loading && messages.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-[#667085]">
              No messages in this conversation yet.
            </div>
          ) : null}

          {/* Centered Date Separator matching Images 1 & 2 */}
          {messages.length > 0 && (
            <div className="flex items-center justify-center my-4">
              <div className="h-[1px] bg-[#E3E6EA] flex-1 max-w-[120px]" />
              <span className="px-4 text-[12px] font-medium text-[#7A808A]">
                {formatDateSeparator(messages[0]!.created_at)}
              </span>
              <div className="h-[1px] bg-[#E3E6EA] flex-1 max-w-[120px]" />
            </div>
          )}

          {/* Messages List */}
          {messages.map((m: Message) => {
            const isUser = m.sender_type === "user";
            const isAssistant = m.sender_type === "assistant";
            const isHumanStaff = m.sender_type === "human";
            const isSystem = m.sender_type === "system";

            if (isSystem) {
              return (
                <div key={m.id} className="flex items-center justify-center my-4">
                  <div className="h-[1px] bg-[#E3E6EA] flex-1 max-w-[100px]" />
                  <span className="px-3 text-[12px] text-[#7A808A]">{m.text}</span>
                  <div className="h-[1px] bg-[#E3E6EA] flex-1 max-w-[100px]" />
                </div>
              );
            }

            if (isUser) {
              return (
                <div key={m.id} className="flex flex-col items-start max-w-[90%] sm:max-w-[80%]">
                  {/* Visitor header */}
                  <div className="flex items-center gap-2 text-[12px] text-[#667085] mb-1.5 pl-12">
                    <span className="font-normal text-[#667085]">{title}</span>
                    <span>·</span>
                    <span>{formatMessageTime(m.created_at)}</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#E4E7EC] text-[#667085] flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 stroke-[2]" />
                    </div>
                    {/* Visitor Bubble: soft neutral gray matching Images 1 & 2 */}
                    <div className="min-w-0 bg-[#F2F4F7] text-[#202125] rounded-[16px] px-4 py-3 text-[16px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            }

            // Outgoing Assistant (Bot) or Human staff message
            return (
              <div key={m.id} className="flex flex-col items-end self-end ml-auto max-w-[90%] sm:max-w-[min(80%,600px)]">
                {/* Header: Agent Name & Time */}
                <div className="flex items-center gap-2 text-[12px] text-[#667085] mb-1.5 px-1">
                  <span className="font-normal text-[#667085]">
                    {isAssistant ? botName : isHumanStaff ? (m.sender_id === userId ? "You" : "Teammate") : "Staff"}
                  </span>
                  <span>·</span>
                  <span>{formatMessageTime(m.created_at)}</span>
                </div>

                <div className="flex items-start gap-2.5 justify-end">
                  {/* Agent Bubble: very pale warm peach matching Images 1 & 2 */}
                  <div
                    className={
                      isAssistant
                        ? "min-w-0 bg-[#FFF3EE] text-[#202125] rounded-[16px] px-4 py-3 text-[16px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]"
                        : "bg-[#F2F4F7] text-[#202125] rounded-[16px] px-4 py-2.5 text-[14px] leading-relaxed border border-[#E3E6EA] whitespace-pre-wrap break-words"
                    }
                  >
                    {m.text}
                  </div>

                  {/* Agent avatar on right */}
                  <div
                    className={
                      isAssistant
                        ? "w-10 h-10 rounded-full bg-[#FFF3EE] text-[#F15A24] border border-[#FCD9C7] flex items-center justify-center shrink-0 mt-0.5"
                        : "w-10 h-10 rounded-full bg-[#344054] text-white flex items-center justify-center shrink-0 mt-0.5"
                    }
                  >
                    {isAssistant ? (
                      <Bot className="w-4 h-4 stroke-[2]" />
                    ) : (
                      <User className="w-3.5 h-3.5 stroke-[2]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* System event indicator line matching Images 1 & 2 */}
          {state === "bot" && messages.length > 0 && (
            <div className="flex items-center justify-center my-6">
              <div className="h-[1px] bg-[#E3E6EA] flex-1 max-w-[120px]" />
              <span className="px-4 text-[12px] text-[#7A808A]">
                {botName} is handling this conversation
              </span>
              <div className="h-[1px] bg-[#E3E6EA] flex-1 max-w-[120px]" />
            </div>
          )}


        </div>

        {/* Pinned Bottom Composer matching Images 1 & 2 */}
        <footer className="inbox-composer shrink-0 border-t border-[#E3E6EA] bg-white p-4 sm:p-5">
          {/* Active Live Call Wave if staff member joined voice call */}
          {live.joined && (
            <div className="mb-3">
              <LiveCallWave
                active={live.joined}
                busy={live.busy}
                audioRef={live.audioRef}
                onEnd={() => void live.leave()}
              />
            </div>
          )}

          {/* Bot-handled state: Handoff notice + disabled composer */}
          {!canSendHuman ? (
            <div className="space-y-3">
              {/* Handoff Notice Card matching Images 1 & 2 */}
              <div className="p-3.5 rounded-[8px] bg-white border border-[#E3E6EA] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[#F2F4F7] text-[#667085] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#202125]">
                      {state === "waiting" ? "This conversation needs a teammate" : state === "human" ? "Another teammate is handling this conversation" : "The agent is handling this conversation"}
                    </p>
                    <p className="text-[12px] text-[#667085]">{state === "human" ? "Replies are managed by the assigned teammate." : "Take chat to reply as a teammate."}</p>
                  </div>
                </div>

                {canTake(state) && <button
                  type="button"
                  onClick={() => void onTake()}
                  disabled={actionBusy}
                  className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#F15A24] hover:text-[#C94716] transition-colors cursor-pointer shrink-0"
                >
                  <span>Take chat</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>}
              </div>

              {/* Disabled Composer Row */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  disabled
                  aria-label="Reply unavailable until you take chat"
                  placeholder="Take chat to write a reply..."
                  className="min-w-0 flex-1 h-11 px-3.5 rounded-[6px] border border-[#E3E6EA] bg-[#F8F9FA] text-[14px] text-[#667085] placeholder-[#667085] cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled
                  className="h-10 px-5 rounded-[6px] bg-[#E4E7EC] text-[#98A2B3] text-[14px] font-medium cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            /* Human-handled state: Active composer with Enter to send */
            <form onSubmit={(e) => void onSend(e)} className="space-y-2">
              <div className="flex items-center justify-between text-[12px] text-[#667085] px-1">
                <span className="font-medium text-[#15803D] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  You are handling this conversation as a teammate.
                </span>
                <button
                  type="button"
                  onClick={() => void onRelease()}
                  disabled={actionBusy}
                  className="text-[#667085] hover:text-[#202125] underline text-[12px]"
                >
                  Release to bot
                </button>
              </div>

              <div className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  aria-label="Reply to conversation"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault();
                  }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a reply as a human teammate..."
                  disabled={sendBusy}
                  className="min-w-0 flex-1 h-11 px-3.5 rounded-[6px] border border-[#E3E6EA] bg-white text-[14px] text-[#202125] placeholder-[#667085] focus:outline-none focus:border-[#F15A24] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sendBusy}
                  className="h-10 px-5 rounded-[6px] bg-[#202125] text-white text-[14px] font-medium hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendBusy ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          )}
        </footer>
      </div>

      {/* Right Details Panel matching Image 2 */}
      {detailsOpen && conversation && (
        <>
          {/* Backdrop on screens < xl */}
          <div
            className="min-[1600px]:hidden fixed inset-0 z-40 bg-black/20"
            onClick={() => setDetailsOpen(false)}
            aria-hidden="true"
          />
          <div id="inbox-conversation-details" ref={detailsRef} className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-[350px] min-[1600px]:static min-[1600px]:z-auto min-[1600px]:w-[350px] min-[1600px]:max-w-none h-full flex flex-col shadow-xl min-[1600px]:shadow-none bg-white">
            <ConversationDetailsPanel
              conversation={conversation}
              agentName={botName}
              summary={summary}
              summaryState={summaryState}
              onClose={() => setDetailsOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
