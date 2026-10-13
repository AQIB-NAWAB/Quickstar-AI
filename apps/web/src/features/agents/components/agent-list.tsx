"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Globe,
  MessageSquare,
  Mic,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import type { Agent } from "../lib/types";
import { deleteAgent } from "../lib/client";
import { CreateAgentForm } from "./create-agent-form";

type Props = {
  workspaceId: string;
  initialAgents: Agent[];
};

function CreateQueryOpener({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("create") === "1") onOpen();
  }, [searchParams, onOpen]);
  return null;
}

export function AgentList({ workspaceId, initialAgents }: Props) {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const openCreate = useCallback(() => setCreateOpen(true), []);

  function closeCreate() {
    setCreateOpen(false);
    if (typeof window !== "undefined" && window.location.search.includes("create=1")) {
      router.replace(`/workspaces/${workspaceId}/agents`);
    }
  }

  const filtered = agents.filter((a) => {
    const q = query.toLowerCase();
    return a.name.toLowerCase().includes(q) || (a.description?.toLowerCase() || "").includes(q);
  });

  async function handleDelete(e: React.MouseEvent, agentId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) {
      return;
    }

    setDeletingId(agentId);
    const res = await deleteAgent(workspaceId, agentId);
    setDeletingId(null);
    if (res.success) {
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
    } else {
      alert(res.error?.message || "Failed to delete agent");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-accent-black tracking-tight">Agents</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-neutral-100 text-neutral-600 border border-border-faint">
              {agents.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Configure system prompts, select AI models, attach tools, and manage release versions.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-8 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      {/* Filter / Search Bar */}
      {agents.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents by name or description..."
              className="w-full pl-9 pr-3 py-2 rounded-8 border border-border-faint bg-white text-xs text-accent-black placeholder-neutral-400 focus:outline-hidden focus:border-heat-100"
            />
          </div>
        </div>
      )}

      {/* Agents Grid / List */}
      {agents.length === 0 ? (
        <div className="rounded-16 border border-dashed border-neutral-300 bg-white p-12 text-center">
          <div className="w-12 h-12 rounded-16 bg-heat-12 text-heat-100 mx-auto flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-accent-black">No agents created yet</h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
            Create your first agent to set up custom prompts, tool integration, and knowledge
            retrieval for your business.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-8 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create your first agent
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-neutral-500 bg-white rounded-12 border border-border-faint">
          No agents match your search query &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent) => {
            const hasPublished = Boolean(agent.production_version_id);
            const modelName =
              (agent.model_settings?.model as string) || "Default (gpt-4o-mini)";

            return (
              <Link
                key={agent.id}
                href={`/workspaces/${workspaceId}/agents/${agent.id}`}
                className="group rounded-12 border border-border-faint bg-white p-5 hover:border-neutral-400 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-10 bg-heat-12 text-heat-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-accent-black group-hover:text-heat-100 transition-colors truncate">
                          {agent.name}
                        </h3>
                        <p className="text-[11px] font-mono text-neutral-400 truncate">
                          {modelName}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, agent.id)}
                      disabled={deletingId === agent.id}
                      title="Delete Agent"
                      className="p-1.5 rounded-6 text-neutral-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-neutral-600 line-clamp-2 leading-relaxed min-h-[32px]">
                    {agent.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-border-faint space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {agent.channels.chat && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-mono text-[10px]">
                          <MessageSquare className="w-3 h-3 text-neutral-500" />
                          Chat
                        </span>
                      )}
                      {agent.channels.voice && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-mono text-[10px]">
                          <Mic className="w-3 h-3 text-neutral-500" />
                          Voice
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-mono text-[10px]">
                        <Globe className="w-3 h-3 text-neutral-500" />
                        {agent.environment}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-neutral-400">
                      Draft v{agent.version}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {hasPublished ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        Live in production
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-medium">
                        ● Unpublished draft
                      </span>
                    )}

                    <span className="text-xs text-neutral-400 group-hover:text-heat-100 group-hover:translate-x-0.5 transition-all inline-flex items-center">
                      Configure <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <Suspense fallback={null}>
        <CreateQueryOpener onOpen={openCreate} />
      </Suspense>
      <FeatureDialog
        open={createOpen}
        onClose={closeCreate}
        title="Create agent"
        description="Identity, instructions, then channels."
        maxWidthClass="max-w-3xl"
      >
        <CreateAgentForm workspaceId={workspaceId} embedded onCancel={closeCreate} />
      </FeatureDialog>
    </div>
  );
}
