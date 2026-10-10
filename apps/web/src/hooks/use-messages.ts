"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getConversation, listMessages } from "@/lib/conversations/client";
import type { Message } from "@/lib/conversations/types";

const POLL_MS = 3000;
const PAGE_SIZE = 50;

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const bySeq = new Map<number, Message>();
  for (const m of existing) {
    bySeq.set(m.seq, m);
  }
  for (const m of incoming) {
    bySeq.set(m.seq, m);
  }
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

export function useMessages(workspaceId: string, conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowStartSeq, setWindowStartSeq] = useState(0);
  const [lastSeq, setLastSeq] = useState(0);
  const maxSeqRef = useRef(0);

  const refreshMeta = useCallback(async () => {
    const { conversation, error: err } = await getConversation(workspaceId, conversationId);
    if (err) {
      setError(err.message);
      return null;
    }
    if (conversation) {
      setLastSeq(conversation.last_seq);
    }
    return conversation ?? null;
  }, [workspaceId, conversationId]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    const conv = await refreshMeta();
    if (!conv) {
      setLoading(false);
      return;
    }
    const start = Math.max(0, conv.last_seq - PAGE_SIZE);
    const { messages: batch, error: err } = await listMessages(workspaceId, conversationId, {
      afterSeq: start,
      limit: PAGE_SIZE,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const merged = batch ?? [];
    setMessages(merged);
    maxSeqRef.current = merged.length ? merged[merged.length - 1]!.seq : 0;
    setWindowStartSeq(start);
    setLoading(false);
  }, [workspaceId, conversationId, refreshMeta]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!conversationId || loading) {
      return;
    }
    let cancelled = false;

    async function poll() {
      const after = maxSeqRef.current;
      const { messages: batch, error: err } = await listMessages(workspaceId, conversationId, {
        afterSeq: after,
        limit: PAGE_SIZE,
      });
      if (cancelled || err || !batch?.length) {
        return;
      }
      setMessages((prev) => {
        const next = mergeMessages(prev, batch);
        maxSeqRef.current = next.length ? next[next.length - 1]!.seq : after;
        return next;
      });
      void refreshMeta();
    }

    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [workspaceId, conversationId, loading, refreshMeta]);

  const loadEarlier = useCallback(async () => {
    if (windowStartSeq <= 0 || loadingEarlier) {
      return;
    }
    setLoadingEarlier(true);
    const newStart = Math.max(0, windowStartSeq - PAGE_SIZE);
    const { messages: batch, error: err } = await listMessages(workspaceId, conversationId, {
      afterSeq: newStart,
      limit: windowStartSeq - newStart,
    });
    setLoadingEarlier(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMessages((prev) => mergeMessages(batch ?? [], prev));
    setWindowStartSeq(newStart);
  }, [workspaceId, conversationId, windowStartSeq, loadingEarlier]);

  const appendLocal = useCallback((message: Message) => {
    setMessages((prev) => mergeMessages(prev, [message]));
    maxSeqRef.current = Math.max(maxSeqRef.current, message.seq);
  }, []);

  return {
    messages,
    loading,
    loadingEarlier,
    error,
    lastSeq,
    canLoadEarlier: windowStartSeq > 0,
    loadEarlier,
    appendLocal,
    reload: loadInitial,
    refreshMeta,
  };
}
