"use client";

import { useEffect, useRef, useState } from "react";
import { getSource } from "../lib/client";
import type { KnowledgeSource } from "../lib/types";

interface UseSourceStatusOptions {
  workspaceId: string;
  initialSource?: KnowledgeSource | null;
  onUpdate?: (source: KnowledgeSource) => void;
  enabled?: boolean;
}
const pending = (source?: KnowledgeSource | null) => source?.status === "queued" || source?.status === "processing";

export function useSourceStatus({ workspaceId, initialSource, onUpdate, enabled = true }: UseSourceStatusOptions) {
  const [source, setSource] = useState(initialSource ?? null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isTerminal, setIsTerminal] = useState(!pending(initialSource));
  const updateRef = useRef(onUpdate);
  updateRef.current = onUpdate;

  useEffect(() => { setSource(initialSource ?? null); }, [initialSource]);
  const sourceId = initialSource?.id;
  const shouldPoll = enabled && pending(initialSource);
  useEffect(() => {
    setRefreshError(null);
    setIsTerminal(!shouldPoll);
    if (!sourceId || !shouldPoll) return;
    let disposed = false, running = false, stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const schedule = () => {
      if (!disposed && !stopped && !document.hidden) timer = setTimeout(poll, 5000);
    };
    async function poll() {
      if (disposed || stopped || running || document.hidden) return;
      running = true;
      controller = new AbortController();
      try {
        const result = await getSource(workspaceId, sourceId!, controller.signal);
        if (disposed) return;
        if ([401, 403, 404].includes(result.status ?? 0)) {
          stopped = true; setIsTerminal(true); setRefreshError(result.error?.message ?? "Could not refresh status");
        } else if (result.source) {
          setSource(result.source); setRefreshError(null); updateRef.current?.(result.source);
          if (!pending(result.source)) { stopped = true; setIsTerminal(true); }
        } else { setRefreshError("Could not refresh status"); }
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) setRefreshError("Could not refresh status");
      } finally { running = false; schedule(); }
    }
    function visibility() {
      clearTimeout(timer);
      if (!document.hidden) void poll();
    }
    schedule();
    document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); document.removeEventListener("visibilitychange", visibility); };
  }, [workspaceId, sourceId, shouldPoll]);
  return { source, refreshError, isTerminal };
}
