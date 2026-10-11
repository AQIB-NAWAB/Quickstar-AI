"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { listConversations } from "@/features/inbox/lib/client";
import {
  conversationTitle,
  INBOX_STATE_FILTERS,
  type Conversation,
  type ConversationState,
} from "@/features/inbox/lib/types";
import { StateBadge } from "./state-badge";

const LIST_REFRESH_MS = 8000;

type Props = {
  workspaceId: string;
  isPreview?: boolean;
};

export function InboxSidebar({ workspaceId, isPreview = false }: Props) {
  const pathname = usePathname();
  const [filter, setFilter] = useState<"all" | ConversationState>("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeId = useMemo(() => {
    const prefix = isPreview ? "/preview/inbox/" : `/workspaces/${workspaceId}/inbox/`;
    if (!pathname.startsWith(prefix)) {
      return null;
    }
    const rest = pathname.slice(prefix.length).split("/")[0];
    return rest || null;
  }, [pathname, workspaceId, isPreview]);

  const load = useCallback(async () => {
    const { conversations: list, error: err } = await listConversations(workspaceId, {
      state: filter === "all" ? undefined : filter,
      limit: 50,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setError(null);
    setConversations(list ?? []);
    setLoading(false);
  }, [workspaceId, filter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), LIST_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return conversations;
    }
    return conversations.filter((c) => {
      const title = conversationTitle(c).toLowerCase();
      return title.includes(q) || c.id.toLowerCase().includes(q);
    });
  }, [conversations, search]);

  return (
    <aside className={clsx(activeId ? "hidden md:flex" : "flex", "w-full md:w-80 lg:w-96 shrink-0 border-r border-border-faint bg-white flex flex-col min-h-0")}>
      <div className="p-4 border-b border-border-faint space-y-3">
        <div>
          <h1 className="text-sm font-bold text-accent-black">Inbox</h1>
          <p className="text-[11px] text-neutral-500 mt-0.5">Workspace conversations</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject or id…"
            className="pl-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {INBOX_STATE_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={clsx(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold border transition-colors",
                filter === tab.id
                  ? "bg-heat-12 text-heat-100 border-heat-24"
                  : "bg-white text-neutral-600 border-border-faint hover:bg-neutral-50",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && conversations.length === 0 ? (
          <p className="p-4 text-xs text-neutral-500">Loading conversations…</p>
        ) : null}
        {error ? <p className="p-4 text-xs text-accent-crimson">{error}</p> : null}
        {!loading && filtered.length === 0 ? (
          <p className="p-4 text-xs text-neutral-500">No conversations in this view.</p>
        ) : null}
        <ul className="divide-y divide-border-faint">
          {filtered.map((c) => {
            const href = `/workspaces/${workspaceId}/inbox/${c.id}`;
            const active = activeId === c.id;
            return (
              <li key={c.id}>
                <Link
                  href={href}
                  className={clsx(
                    "block px-4 py-3 hover:bg-neutral-50 transition-colors",
                    active && "bg-heat-8 border-l-2 border-heat-100",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-accent-black truncate">{conversationTitle(c)}</p>
                    <StateBadge state={c.state} />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1 font-mono truncate">{c.id}</p>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Updated {new Date(c.updated_at).toLocaleString()}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
