"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getConversation, listMessages } from "@/lib/conversations/client";
import { conversationTitle, senderLabel, type Conversation, type Message } from "@/lib/conversations/types";

type Props = {
  workspaceId: string;
  conversationId: string;
};

export function TranscriptView({ workspaceId, conversationId }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [convRes, msgRes] = await Promise.all([
        getConversation(workspaceId, conversationId),
        listMessages(workspaceId, conversationId, { limit: 500 }),
      ]);
      if (convRes.error) {
        setError(convRes.error.message);
        return;
      }
      if (msgRes.error) {
        setError(msgRes.error.message);
        return;
      }
      setConversation(convRes.conversation ?? null);
      setMessages(msgRes.messages ?? []);
    }
    void load();
  }, [workspaceId, conversationId]);

  return (
    <article className="flex-1 overflow-y-auto p-6 md:p-10 bg-white print:p-0">
      <div className="max-w-3xl mx-auto print:max-w-none">
        <div className="flex items-start justify-between gap-4 mb-6 print:mb-4">
          <div>
            <h1 className="text-lg font-bold text-accent-black">
              {conversation ? conversationTitle(conversation) : "Transcript"}
            </h1>
            <p className="text-xs font-mono text-neutral-500 mt-1">{conversationId}</p>
            {conversation ? (
              <p className="text-xs text-neutral-500 mt-2">
                State: {conversation.state} · Messages: {messages.length}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2 print:hidden">
            <Link
              href={`/workspaces/${workspaceId}/inbox/${conversationId}`}
              className="text-xs font-medium text-heat-100 hover:underline"
            >
              Thread
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="text-xs font-semibold border border-border-faint rounded-10 px-3 py-1.5 hover:bg-neutral-50"
            >
              Print
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-accent-crimson">{error}</p> : null}

        <ol className="space-y-4 border-t border-border-faint pt-6">
          {messages.map((m) => (
            <li key={m.id} className="text-sm">
              <p className="text-[11px] font-semibold text-neutral-500">
                [{new Date(m.created_at).toISOString()}] {senderLabel(m.sender_type)} (seq {m.seq})
              </p>
              <p className="mt-1 whitespace-pre-wrap text-accent-black">{m.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
