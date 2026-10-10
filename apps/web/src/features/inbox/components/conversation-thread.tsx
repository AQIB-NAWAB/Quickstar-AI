"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getConversation,
  releaseConversation,
  sendHumanMessage,
  takeConversation,
} from "@/features/inbox/lib/client";
import type { Conversation, ConversationState } from "@/features/inbox/lib/types";
import { conversationTitle, senderLabel } from "@/features/inbox/lib/types";
import { useMessages } from "@/features/inbox/hooks/use-messages";
import { StateBadge } from "./state-badge";

type Props = {
  workspaceId: string;
  conversationId: string;
  userId: string;
};

function canTake(state: ConversationState): boolean {
  return state === "bot" || state === "waiting";
}

export function ConversationThread({ workspaceId, conversationId, userId }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");

  const {
    messages,
    loading,
    loadingEarlier,
    error: messagesError,
    canLoadEarlier,
    loadEarlier,
    appendLocal,
    refreshMeta,
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
    void syncConversation();
  }, [syncConversation]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void syncConversation();
      void refreshMeta();
    }, 8000);
    return () => window.clearInterval(id);
  }, [syncConversation, refreshMeta]);

  async function onTake() {
    setBusy(true);
    setActionError(null);
    const { conversation: c, error } = await takeConversation(workspaceId, conversationId);
    setBusy(false);
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
    setBusy(true);
    setActionError(null);
    const { conversation: c, error } = await releaseConversation(workspaceId, conversationId);
    setBusy(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    if (c) {
      setConversation(c);
    }
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || conversation?.state !== "human") {
      return;
    }
    setBusy(true);
    setActionError(null);
    const key = `web-human-${crypto.randomUUID()}`;
    const { message, error } = await sendHumanMessage(workspaceId, conversationId, text, key);
    setBusy(false);
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

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-background-base">
        <header className="shrink-0 border-b border-border-faint bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-accent-black truncate">
              {conversation ? conversationTitle(conversation) : "Conversation"}
            </h2>
            <p className="text-[10px] font-mono text-neutral-500 truncate">{conversationId}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {conversation ? <StateBadge state={conversation.state} /> : null}
            <Link
              href={`/workspaces/${workspaceId}/inbox/${conversationId}/transcript`}
              className="text-[11px] font-medium text-heat-100 hover:underline"
            >
              Transcript
            </Link>
          </div>
        </header>

        {(metaError || messagesError || actionError) && (
          <div className="shrink-0 px-4 py-2 bg-red-50 text-xs text-accent-crimson border-b border-red-100">
            {actionError ?? metaError ?? messagesError}
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
            const isHuman = m.sender_type === "human";
            const isAi = m.sender_type === "assistant";
            return (
              <div
                key={m.id}
                className={`flex ${isHuman ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-12 px-3 py-2 text-sm shadow-sm border ${
                    isHuman
                      ? "bg-heat-12 border-heat-24 text-accent-black"
                      : isAi
                        ? "bg-white border-border-faint text-accent-black"
                        : "bg-neutral-50 border-border-faint text-accent-black"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-neutral-500 mb-1">
                    {senderLabel(m.sender_type)} · seq {m.seq} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString()}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {m.metadata && Object.keys(m.metadata).length > 0 ? (
                    <pre className="mt-2 text-[10px] font-mono text-neutral-500 overflow-x-auto">
                      {JSON.stringify(m.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="shrink-0 border-t border-border-faint bg-white p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!conversation || !canTake(state) || busy}
              loading={busy}
              onClick={() => void onTake()}
            >
              Take over
            </Button>
            <Button
              variant="ghost"
              disabled={!conversation || state !== "human" || busy}
              loading={busy}
              onClick={() => void onRelease()}
            >
              Release to bot
            </Button>
          </div>
          {state === "human" ? (
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
          <form onSubmit={(e) => void onSend(e)} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={canSendHuman ? "Reply as human…" : "Take conversation to reply…"}
              disabled={!canSendHuman || busy}
              className="flex-1 text-sm"
            />
            <Button type="submit" disabled={!canSendHuman || busy || !draft.trim()} loading={busy}>
              Send
            </Button>
          </form>
        </footer>
      </div>

      <aside className="hidden xl:flex w-72 shrink-0 border-l border-border-faint bg-white flex-col p-4 text-xs space-y-3">
        <h3 className="font-bold text-accent-black">Details</h3>
        {conversation ? (
          <>
            <DetailRow label="State" value={conversation.state} />
            <DetailRow label="Subject key" value={conversation.subject_key ?? "—"} />
            <DetailRow label="Agent" value={conversation.agent_id ?? "—"} mono />
            <DetailRow label="Assignee" value={conversation.assignee_user_id ?? "—"} mono />
            <DetailRow label="Last seq" value={String(conversation.last_seq)} />
            <DetailRow label="Started" value={new Date(conversation.created_at).toLocaleString()} />
            <DetailRow label="Updated" value={new Date(conversation.updated_at).toLocaleString()} />
          </>
        ) : (
          <p className="text-neutral-500">Loading…</p>
        )}
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
