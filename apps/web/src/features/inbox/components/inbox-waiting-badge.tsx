"use client";

import { useEffect, useState } from "react";
import { listConversations } from "@/features/inbox/lib/client";

export function useWaitingCount(workspaceId: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { conversations } = await listConversations(workspaceId, { state: "waiting", limit: 50 });
      if (!cancelled) {
        setCount(conversations?.length ?? 0);
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [workspaceId]);

  return count;
}
