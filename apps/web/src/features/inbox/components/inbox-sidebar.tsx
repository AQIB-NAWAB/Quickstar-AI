"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ChevronDown, PanelLeft, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { listConversations, listWidgetLiveCalls, type WidgetLiveCall } from "@/features/inbox/lib/client";
import {
  conversationRef,
  conversationTitle,
  visitorIdentity,
  formatConversationTime,
  INBOX_STATE_FILTERS,
  type Conversation,
  type ConversationState,
} from "@/features/inbox/lib/types";
import { StateBadge } from "./state-badge";

const LIST_REFRESH_MS = 8000;
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none",
        EASE,
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

type Props = {
  workspaceId: string;
  isPreview?: boolean;
};

export function InboxSidebar({ workspaceId, isPreview = false }: Props) {
  const pathname = usePathname();
  const [filter, setFilter] = useState<"all" | ConversationState>("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [liveCalls, setLiveCalls] = useState<WidgetLiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [liveOpen, setLiveOpen] = useState(true);
  const [conversationsOpen, setConversationsOpen] = useState(true);

  const activeId = useMemo(() => {
    const prefix = isPreview ? "/preview/inbox/" : `/workspaces/${workspaceId}/inbox/`;
    if (!pathname.startsWith(prefix)) {
      return null;
    }
    const rest = pathname.slice(prefix.length).split("/")[0];
    return rest || null;
  }, [pathname, workspaceId, isPreview]);

  const load = useCallback(async () => {
    const { conversations: list, error: err } = await listConversations(workspaceId, { limit: 50 });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setError(null);
    setConversations(list ?? []);
    const live = await listWidgetLiveCalls(workspaceId);
    setLiveCalls(live.calls ?? []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), LIST_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const hrefFor = useCallback(
    (conversationId: string) =>
      isPreview ? `/preview/inbox/${conversationId}` : `/workspaces/${workspaceId}/inbox/${conversationId}`,
    [isPreview, workspaceId],
  );

  const byId = useMemo(() => new Map(conversations.map((conversation) => [conversation.id, conversation])), [conversations]);
  const liveIds = useMemo(() => new Set(liveCalls.map((call) => call.conversation_id)), [liveCalls]);

  const query = search.trim().toLowerCase();
  const visibleLiveCalls = useMemo(() => {
    if (!query) return liveCalls;
    return liveCalls.filter((call) => {
      const conversation = byId.get(call.conversation_id);
      const title = (conversation ? conversationTitle(conversation) : "Website visitor").toLowerCase();
      const ref = (conversation ? conversationRef(conversation) : "").toLowerCase();
      return title.includes(query) || ref.includes(query) || (call.human_name ?? "").toLowerCase().includes(query);
    });
  }, [liveCalls, byId, query]);

  const filtered = useMemo(() => {
    return conversations.filter((conversation) => {
      if (liveIds.has(conversation.id)) return false;
      if (filter !== "all" && conversation.state !== filter) return false;
      if (!query) return true;
      const title = conversationTitle(conversation).toLowerCase();
      const email = (visitorIdentity(conversation)?.email ?? "").toLowerCase();
      return title.includes(query) || email.includes(query) || conversationRef(conversation).toLowerCase().includes(query);
    });
  }, [conversations, liveIds, filter, query]);

  return (
    <aside
      className={clsx(
        activeId ? "hidden md:flex" : "flex",
        "relative shrink-0 overflow-hidden border-r border-border-faint bg-white flex-col min-h-0 transition-[width] duration-300 motion-reduce:transition-none",
        EASE,
        collapsed ? "w-12" : "w-full md:w-64",
      )}
    >
      <div
        className={clsx(
          "absolute inset-y-0 left-0 z-20 flex w-12 flex-col items-center gap-3 py-3 transition-opacity duration-200 motion-reduce:transition-none",
          collapsed ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          aria-expanded={false}
          aria-label="Show inbox"
          onClick={() => setCollapsed(false)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-10 text-neutral-600 hover:bg-neutral-50 hover:text-accent-black"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        {liveCalls.length > 0 ? (
          <span className="text-[10px] font-semibold text-heat-100">{liveCalls.length}</span>
        ) : null}
      </div>
      <div
        className={clsx(
          "flex h-full min-h-0 w-full min-w-64 flex-col transition-opacity duration-200 motion-reduce:transition-none md:w-64",
          collapsed ? "pointer-events-none opacity-0" : "opacity-100 delay-75",
        )}
      >
      <div className="p-4 border-b border-border-faint space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-sm font-bold text-accent-black">Inbox</h1>
            <p className="text-[12px] font-medium text-neutral-500 mt-0.5">Workspace conversations</p>
          </div>
          <button
            type="button"
            aria-expanded
            aria-label="Hide inbox"
            onClick={() => setCollapsed(true)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-10 text-neutral-500 hover:bg-neutral-50 hover:text-accent-black"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visitors…"
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

      <section className="shrink-0 border-b border-border-faint bg-heat-4">
        <button
          type="button"
          aria-expanded={liveOpen}
          onClick={() => setLiveOpen((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left"
        >
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-heat-100">Live calls</h2>
          <span className="flex items-center gap-2 text-[10px] font-semibold text-heat-100">
            {visibleLiveCalls.length}
            <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none", EASE, !liveOpen && "-rotate-90")} />
          </span>
        </button>
        <Collapse open={liveOpen}>
          {visibleLiveCalls.length === 0 ? (
          <p className="px-4 pb-3 text-[11px] text-neutral-500">No live calls right now.</p>
        ) : (
          <ul className="max-h-48 overflow-y-auto">
            {visibleLiveCalls.map((call) => {
              const conversation = byId.get(call.conversation_id);
              const active = activeId === call.conversation_id;
              const label = call.needs_human
                ? "Needs a person"
                : call.human_name
                  ? `With ${call.human_name}`
                  : "With the bot";
              return (
                <li key={call.conversation_id}>
                  <Link
                    href={hrefFor(call.conversation_id)}
                    className={clsx(
                      "block px-4 py-2.5 hover:bg-heat-8 transition-colors",
                      active && "bg-heat-12 border-l-2 border-heat-100",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-accent-black truncate">
                        {conversation ? conversationTitle(conversation) : "Website visitor"}
                      </p>
                      <span className="shrink-0 rounded-full bg-heat-100 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-neutral-600 mt-1">
                      {conversation ? `${conversationRef(conversation)} · ` : ""}
                      {label}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        </Collapse>
      </section>

      <section
        className={clsx(
          "flex min-h-0 flex-col overflow-hidden transition-[flex-grow] duration-300 motion-reduce:transition-none",
          EASE,
          conversationsOpen ? "flex-1" : "flex-none",
        )}
      >
        <button
          type="button"
          aria-expanded={conversationsOpen}
          onClick={() => setConversationsOpen((open) => !open)}
          className="sticky top-0 z-10 flex w-full items-center justify-between bg-white px-4 py-2.5 border-b border-border-faint text-left"
        >
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Conversations</h2>
          <span className="flex items-center gap-2 text-[10px] font-semibold text-neutral-400">
            {filtered.length}
            <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform duration-300 motion-reduce:transition-none", EASE, !conversationsOpen && "-rotate-90")} />
          </span>
        </button>
        <Collapse open={conversationsOpen} className={conversationsOpen ? "min-h-0 flex-1" : undefined}>
        {loading && conversations.length === 0 ? (
          <p className="p-4 text-xs text-neutral-500">Loading conversations…</p>
        ) : null}
        {error ? <p className="p-4 text-xs text-accent-crimson">{error}</p> : null}
        {!loading && filtered.length === 0 ? (
          <p className="p-4 text-xs text-neutral-500">No other conversations in this view.</p>
        ) : null}
        <ul className="divide-y divide-border-faint">
          {filtered.map((c) => {
            const active = activeId === c.id;
            return (
              <li key={c.id}>
                <Link
                  href={hrefFor(c.id)}
                  className={clsx(
                    "block px-4 py-3.5 hover:bg-neutral-50 transition-colors",
                    active && "bg-heat-8 border-l-2 border-heat-100",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-accent-black truncate">{conversationTitle(c)}</p>
                    <StateBadge state={c.state} />
                  </div>
                  <p className="text-[11px] font-medium text-neutral-500 mt-1.5 truncate">
                    {visitorIdentity(c)?.email ? `${visitorIdentity(c)?.email} · ` : ""}
                    {conversationRef(c)} · {formatConversationTime(c.updated_at)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
        </Collapse>
      </section>
      </div>
    </aside>
  );
}
