"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Bot,
  ChevronDown,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { Agent } from "../lib/types";
import { deleteAgent } from "../lib/client";
import { AgentCard } from "./agent-card";
import { CreateAgentDialog } from "./create-agent-dialog";
import { TestAgentPanel } from "./test-agent-panel";

type Props = {
  workspaceId: string;
  workspaceName?: string;
  initialAgents: Agent[];
};

type StatusFilter = "all" | "published" | "unpublished";
type SortOrder = "asc" | "desc";

function CreateQueryOpener({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("create") === "1") onOpen();
  }, [searchParams, onOpen]);
  return null;
}

export function AgentList({ workspaceId, workspaceName = "Workspace", initialAgents }: Props) {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Create wizard state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const openCreate = useCallback(() => setIsCreateOpen(true), []);

  function closeCreate() {
    setIsCreateOpen(false);
    if (typeof window !== "undefined" && window.location.search.includes("create=1")) {
      router.replace(`/workspaces/${workspaceId}/agents`);
    }
  }

  // Active test drawer state
  const [activeTestingAgent, setActiveTestingAgent] = useState<Agent | null>(null);

  // Filter & sort agents
  const filteredAndSortedAgents = useMemo(() => {
    return agents
      .filter((agent) => {
        // Status filter
        if (statusFilter === "published" && !agent.production_version_id) return false;
        if (statusFilter === "unpublished" && agent.production_version_id) return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const nameMatch = agent.name.toLowerCase().includes(q);
          const descMatch = (agent.description || "").toLowerCase().includes(q);
          const instructionsMatch = (agent.instructions || "").toLowerCase().includes(q);
          return nameMatch || descMatch || instructionsMatch;
        }

        return true;
      })
      .sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [agents, statusFilter, searchQuery, sortOrder]);

  // Handle agent deletion
  async function handleDeleteAgent(agentId: string): Promise<boolean> {
    const res = await deleteAgent(workspaceId, agentId);
    if (res.success) {
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (activeTestingAgent?.id === agentId) {
        setActiveTestingAgent(null);
      }
      return true;
    }
    return false;
  }

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Page Header matching 2.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold text-[#202125] tracking-tight">Agents</h1>
          <p className="mt-1 text-[15px] text-[#667085]">Your agents, ready to work.</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[6px] bg-[#F15A24] text-white text-[14px] font-medium hover:bg-[#C94716] transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create agent
        </button>
      </div>

      {/* Toolbar: Search input on left, Status dropdown on right */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-[440px]">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents"
            className="w-full pl-9 pr-8 h-11 rounded-[6px] border border-[#E1E5EA] bg-white text-[14px] text-[#202125] placeholder-[#7A808A] focus:outline-none focus:border-[#F15A24] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A808A] hover:text-[#202125]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="appearance-none pl-3 pr-8 h-11 rounded-[6px] border border-[#E1E5EA] bg-white text-[14px] text-[#202125] font-medium focus:outline-none focus:border-[#F15A24] cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Subheader: "Your agents ({count})" & Sort control */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[15px] font-semibold text-[#202125]">
          Your agents{" "}
          <span className="text-[#667085] font-normal text-[14px]">
            {filteredAndSortedAgents.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium text-[#667085] hover:text-[#202125] hover:bg-white border border-transparent hover:border-[#E1E5EA] transition-colors"
          title={`Sort ${sortOrder === "asc" ? "Z to A" : "A to Z"}`}
        >
          {sortOrder === "asc" ? (
            <ArrowDownAZ className="w-4 h-4 text-[#667085]" />
          ) : (
            <ArrowUpAZ className="w-4 h-4 text-[#667085]" />
          )}
          <span>Name</span>
        </button>
      </div>

      {/* Agents Cards List (Stacked cards matching 2.png) */}
      {agents.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[#CCD2D8] bg-white p-12 text-center">
          <div className="w-12 h-12 rounded-[10px] bg-[#FFF3ED] text-[#F15A24] mx-auto flex items-center justify-center mb-4">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-[18px] font-semibold text-[#202125]">No agents yet</h3>
          <p className="mt-1 text-[14px] text-[#667085] max-w-sm mx-auto leading-relaxed">
            Create your first agent to set up instructions, AI models, and tools for your business.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-[#F15A24] text-white text-[14px] font-medium hover:bg-[#C94716] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create agent
            </button>
          </div>
        </div>
      ) : filteredAndSortedAgents.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-[10px] border border-[#E1E5EA] space-y-3">
          <p className="text-[15px] text-[#667085]">
            No agents match your search or selected filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="px-3.5 py-1.5 rounded-[6px] text-[14px] font-medium text-[#202125] bg-white border border-[#E1E5EA] hover:bg-[#F8F9FA] transition-colors"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              workspaceId={workspaceId}
              onTestAgent={(a) => setActiveTestingAgent(a)}
              onDeleteAgent={handleDeleteAgent}
            />
          ))}
        </div>
      )}

      {/* Footer count indicator */}
      {agents.length > 0 && (
        <div className="pt-2 text-[13px] text-[#667085] flex justify-between items-center">
          <span>
            Showing {filteredAndSortedAgents.length} of {agents.length}{" "}
            {agents.length === 1 ? "agent" : "agents"}
          </span>
        </div>
      )}

      {/* Deep Link URL opener for ?create=1 */}
      <Suspense fallback={null}>
        <CreateQueryOpener onOpen={openCreate} />
      </Suspense>

      {/* Create Agent Wizard Dialog (7.png, 8.png, 9.png) */}
      <CreateAgentDialog
        isOpen={isCreateOpen}
        onClose={closeCreate}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />

      {/* Slide-over Test Agent Drawer when launched from an agent card */}
      {activeTestingAgent && (
        <TestAgentPanel
          agent={activeTestingAgent}
          workspaceId={workspaceId}
          releaseNumber={undefined}
          isInline={false}
          onClose={() => setActiveTestingAgent(null)}
        />
      )}
    </div>
  );
}
