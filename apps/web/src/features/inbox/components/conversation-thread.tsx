"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clsx } from "clsx";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getConversation,
  releaseConversation,
  leaveWidgetCall,
  sendHumanMessage,
  summarizeConversation,
  takeConversation,
} from "@/features/inbox/lib/client";
import type { Conversation, ConversationState } from "@/features/inbox/lib/types";
import { conversationRef, conversationTitle, senderLabel, visitorIdentity } from "@/features/inbox/lib/types";
import { useMessages } from "@/features/inbox/hooks/use-messages";
import { LiveCallWave, useStaffLiveCall } from "./live-call-panel";
import { StateBadge } from "./state-badge";

type Props = {
  workspaceId: string;
  conversationId: string;
  userId: string;
  agentName: string;
};

function canTake(state: ConversationState): boolean {
  return state === "bot" || state === "waiting";
}

export function ConversationThread({ workspaceId, conversationId, userId, agentName }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<"idle" | "loading" | "ready" | "waiting">("idle");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    messages,
    loading,
    loadingEarlier,
    error: messagesError,
    canLoadEarlier,
    loadEarlier,
    appendLocal,
  } = useMessages(workspaceId, conversationId);

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
    setDetailsOpen(false);
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
    setActionBusy(true);
    setActionError(null);
    const { conversation: c, error } = await takeConversation(workspaceId, conversationId);
    setActionBusy(false);
    if (error) {
      setActionError(
        error.code === "CONFLICT" || error.message.toLowerCase().includes("conflict")
          ? "Another agent took this conversation first."
          : error.message,
      );
      void syncConversation();
      return;
    }
    if (c) {
      setConversation(c);
    }
  }

  async function onRelease() {
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
    if (!text || conversation?.state !== "human") {
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
  const isAssignee = conversation?.assignee_user_id === userId;
  const canSendHuman = state === "human";
  const live = useStaffLiveCall({
    workspaceId,
    conversationId,
    agentName,
    state,
    onConversation: setConversation,
  });
  const headerButton =
    "inline-flex items-center gap-1.5 rounded-10 border border-border-faint bg-white px-3 py-1.5 text-[11px] font-semibold text-accent-black hover:bg-neutral-50 disabled:opacity-60";

  return (
    <div className="relative flex flex-1 min-h-0 min-w-0">
      <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-background-base">
        <header className="shrink-0 border-b border-border-faint bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-accent-black truncate">
              {conversation ? conversationTitle(conversation) : "Conversation"}
            </h2>
            <p className="text-[11px] font-medium text-neutral-500 truncate">
              {conversation
                ? `${visitorIdentity(conversation)?.email ? `${visitorIdentity(conversation)?.email} · ` : ""}${conversationRef(conversation)}`
                : "Conversation"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {conversation ? <StateBadge state={conversation.state} /> : null}
            {live.call && !live.joined ? (
              <button type="button" className={headerButton} disabled={live.busy} onClick={() => void live.join()}>
                <Phone className="h-3.5 w-3.5 text-heat-100" />
                {live.busy ? "Joining…" : "Join call"}
              </button>
            ) : null}
            {canTake(state) && !live.call ? (
              <button type="button" className={headerButton} disabled={!conversation || actionBusy} onClick={() => void onTake()}>
                {actionBusy ? "Taking…" : "Take chat"}
              </button>
            ) : null}
            {state === "human" ? (
              <button type="button" className={headerButton} disabled={!conversation || actionBusy} onClick={() => void onRelease()}>
                {actionBusy ? "Releasing…" : "Release to bot"}
              </button>
            ) : null}
            <button
              type="button"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((open) => !open)}
              className={headerButton}
            >
              {detailsOpen ? "Hide details" : "View details"}
            </button>
            <Link
              href={`/workspaces/${workspaceId}/inbox/${conversationId}/transcript`}
              className="text-[11px] font-medium text-heat-100 hover:underline"
            >
              Transcript
            </Link>
          </div>
        </header>

        {(metaError || messagesError || actionError || live.error) && (
          <div className="shrink-0 px-4 py-2 bg-red-50 text-xs text-accent-crimson border-b border-red-100">
            {actionError ?? live.error ?? metaError ?? messagesError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
          {canLoadEarlier ? (
            <div className="flex justify-center">
              <Button variant="ghost" loading={loadingEarlier} onClick={() => void loadEarlier()}>
                Load earlier messages
              </Button>
            </div>
          ) : null}
          {loading ? <p className="text-xs text-neutral-500 text-center">Loading messages…</p> : null}
          {!loading && messages.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center">No messages yet.</p>
          ) : null}
          {messages.map((m) => {
            const fromUs = m.sender_type === "assistant" || m.sender_type === "human";
            const isSystem = m.sender_type === "system";
            return (
              <div
                key={m.id}
                className={`flex ${isSystem ? "justify-center" : fromUs ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-12 px-3 py-2 text-sm shadow-sm border ${
                    isSystem
                      ? "bg-transparent border-0 shadow-none text-center text-neutral-500"
                      : fromUs
                        ? "bg-heat-12 border-heat-24 text-accent-black"
                        : "bg-white border-border-faint text-accent-black"
                  }`}
                >
                  <p className={`text-[11px] font-semibold mb-1 ${fromUs ? "text-heat-100 text-right" : "text-neutral-500"}`}>
                    {senderLabel(m.sender_type)} · {new Date(m.created_at).toLocaleTimeString()}
                  </p>
                  <p className="whitespace-pre-wrap break-words font-medium">{m.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="shrink-0 border-t border-border-faint bg-white p-4 space-y-3">
          {live.joined ? null : state === "human" ? (
            <p className="text-[11px] text-neutral-500">
              Bot replies are paused while state is human.
              {conversation?.assignee_user_id
                ? isAssignee
                  ? " You are the assignee."
                  : " Assigned to another user (admin can still send)."
                : null}
            </p>
          ) : (
            <p className="text-[11px] text-neutral-500">Take the conversation to send as a human agent.</p>
          )}
          <LiveCallWave active={live.joined} busy={live.busy} audioRef={live.audioRef} onEnd={() => void live.leave()} />
          <form onSubmit={(e) => void onSend(e)} className="flex w-full items-center gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={canSendHuman ? "Reply as human…" : "Take conversation to reply…"}
                disabled={!canSendHuman || sendBusy}
                className="w-full text-sm"
              />
            </div>
            <Button type="submit" disabled={!canSendHuman || sendBusy || !draft.trim()} loading={sendBusy}>
              Send
            </Button>
          </form>
        </footer>
      </div>

      <aside
        className={clsx(
          "absolute inset-y-0 right-0 z-20 flex w-80 max-w-full shrink-0 flex-col overflow-hidden border-border-faint bg-white shadow-lg transition-[width,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:static md:z-0 md:translate-x-0 md:shadow-none",
          detailsOpen
            ? "translate-x-0 border-l opacity-100 md:w-80"
            : "pointer-events-none translate-x-full border-l-0 opacity-0 md:w-0 md:translate-x-0",
        )}
        aria-hidden={!detailsOpen}
      >
        <div className="flex h-full w-80 max-w-full flex-col overflow-y-auto p-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-accent-black">Details</h3>
            <button
              type="button"
              onClick={() => setDetailsOpen(false)}
              className="text-[11px] font-semibold text-neutral-500 hover:text-accent-black"
            >
              Close
            </button>
          </div>
          <div className="mt-4 rounded-12 border border-border-faint bg-background-lighter p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Summary</p>
            {summaryState === "ready" && summary ? (
              <p className="mt-1 text-sm font-medium text-accent-black">{summary}</p>
            ) : summaryState === "loading" ? (
              <p className="mt-1 text-[11px] text-neutral-500">Writing a summary of this chat…</p>
            ) : (
              <p className="mt-1 text-[11px] text-neutral-500">A summary appears after the chat has a few messages.</p>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {conversation ? (
              <>
                <DetailRow label="State" value={conversation.state} />
                <DetailRow label="Visitor" value={conversationTitle(conversation)} />
                {visitorIdentity(conversation)?.email ? (
                  <DetailRow label="Email" value={visitorIdentity(conversation)!.email} />
                ) : null}
                <DetailRow label="Reference" value={conversationRef(conversation)} />
                <DetailRow label="Agent" value={conversation.agent_id ? "Published agent" : "—"} />
                <DetailRow label="Assignee" value={conversation.assignee_user_id ? "Assigned" : "—"} />
                <DetailRow label="Last seq" value={String(conversation.last_seq)} />
                <DetailRow label="Started" value={new Date(conversation.created_at).toLocaleString()} />
                <DetailRow label="Updated" value={new Date(conversation.updated_at).toLocaleString()} />
              </>
            ) : (
              <p className="text-neutral-500">Loading…</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">{label}</p>
      <p className={`mt-0.5 text-neutral-700 break-all ${mono ? "font-mono text-[10px]" : ""}`}>{value}</p>
    </div>
  );
}
