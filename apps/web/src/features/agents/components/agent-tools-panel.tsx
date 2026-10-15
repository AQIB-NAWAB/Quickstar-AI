"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, Settings2, Wrench } from "lucide-react";
import type { AgentToolDefinition } from "../lib/types";
import { BUILTIN_TOOLS, customToolToAgentTool } from "../lib/tools";
import type { CustomToolItem } from "@/features/settings/lib/types";
import { CustomToolsModal } from "@/features/settings/components/custom-tools-modal";
import { AgentToolsManageDrawer } from "./agent-tools-manage-drawer";
import { listSecrets } from "@/features/settings/lib/client";

type ToolFilter = "all" | "builtin" | "custom";

type Props = {
  workspaceId: string;
  canManageCustomTools: boolean;
  attachedTools: AgentToolDefinition[];
  onToggle: (tool: AgentToolDefinition) => void;
  customTools: CustomToolItem[];
  customToolsLoading: boolean;
  customToolsError: string | null;
  onCustomToolsChange: (tools: CustomToolItem[]) => void;
};

function ToolRow({
  tool,
  badge,
  attached,
  onToggle,
}: {
  tool: AgentToolDefinition;
  badge: string;
  attached: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-10 border px-3 py-2.5 transition-colors ${
        attached ? "border-neutral-300 bg-neutral-50/80" : "border-border-faint bg-white"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold text-accent-black">{tool.name}</span>
          <span className="rounded-full border border-border-faint bg-neutral-50 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">
            {badge}
          </span>
          {attached && (
            <span className="rounded-full border border-green-200 bg-green-50 px-1.5 py-0.5 text-[9px] font-semibold text-green-700">
              On agent
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-600">{tool.description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`shrink-0 rounded-8 px-2.5 py-1 text-[11px] font-semibold transition-colors ${
          attached
            ? "border border-border-faint bg-white text-neutral-700 hover:bg-neutral-50"
            : "bg-accent-black text-white hover:bg-neutral-800"
        }`}
      >
        {attached ? "Remove" : "Attach"}
      </button>
    </div>
  );
}

export function AgentToolsPanel({
  workspaceId,
  canManageCustomTools,
  attachedTools,
  onToggle,
  customTools,
  customToolsLoading,
  customToolsError,
  onCustomToolsChange,
}: Props) {
  const [filter, setFilter] = useState<ToolFilter>("all");
  const [builtinOpen, setBuiltinOpen] = useState(true);
  const [customOpen, setCustomOpen] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [secretNames, setSecretNames] = useState<string[]>([]);

  const attachedCount = attachedTools.length;

  const customAgentTools = useMemo(
    () => customTools.map((t) => ({ custom: t, tool: customToolToAgentTool(t) })),
    [customTools],
  );

  const showBuiltin = filter === "all" || filter === "builtin";
  const showCustom = filter === "all" || filter === "custom";

  async function openQuickAdd() {
    if (secretNames.length === 0) {
      const res = await listSecrets(workspaceId);
      setSecretNames((res.secrets ?? []).map((s) => s.name));
    }
    setQuickAddOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-accent-black">Tools & functions</h3>
          <p className="mt-0.5 max-w-xl text-[11px] text-neutral-500 leading-relaxed">
            Callable actions for chat, widget, and voice. Attach built-ins or workspace tools you
            define.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageCustomTools && (
            <>
              <button
                type="button"
                onClick={() => void openQuickAdd()}
                className="inline-flex items-center gap-1.5 rounded-8 bg-accent-black px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-neutral-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Add custom tool
              </button>
              <button
                type="button"
                onClick={() => setManageOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-[11px] font-semibold text-accent-black hover:bg-neutral-50"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Manage tools
              </button>
            </>
          )}
        </div>
      </div>

      {attachedCount > 0 && (
        <div className="rounded-10 border border-border-faint bg-neutral-50/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Attached to this agent ({attachedCount})
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {attachedTools.map((t) => (
              <span
                key={t.name}
                className="rounded-full border border-border-faint bg-white px-2 py-0.5 font-mono text-[10px] text-accent-black"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-semibold text-neutral-500">Show</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as ToolFilter)}
          className="rounded-8 border border-border-faint bg-white px-2.5 py-1.5 text-[11px] font-medium text-accent-black focus:border-neutral-400 focus:outline-hidden"
        >
          <option value="all">All tools</option>
          <option value="builtin">Built-in only</option>
          <option value="custom">Custom only</option>
        </select>
      </div>

      {showBuiltin && (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setBuiltinOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-8 py-1 text-left"
          >
            <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-600">
              Built-in ({BUILTIN_TOOLS.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-neutral-400 transition-transform ${builtinOpen ? "" : "-rotate-90"}`}
            />
          </button>
          {builtinOpen && (
            <div className="space-y-1.5">
              {BUILTIN_TOOLS.map((tool) => (
                <ToolRow
                  key={tool.name}
                  tool={tool}
                  badge={tool.type === "builtin_web" ? "WEB" : "LEADS"}
                  attached={attachedTools.some((t) => t.name === tool.name)}
                  onToggle={() => onToggle(tool)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showCustom && (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setCustomOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-8 py-1 text-left"
          >
            <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-600">
              Custom ({customTools.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-neutral-400 transition-transform ${customOpen ? "" : "-rotate-90"}`}
            />
          </button>
          {customOpen && (
            <div className="space-y-1.5">
              {customToolsLoading ? (
                <div className="space-y-1.5 animate-pulse">
                  <div className="h-12 rounded-10 bg-neutral-100" />
                  <div className="h-12 rounded-10 bg-neutral-100" />
                </div>
              ) : customToolsError ? (
                <p className="rounded-10 border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
                  {customToolsError}
                </p>
              ) : customAgentTools.length === 0 ? (
                <div className="rounded-10 border border-dashed border-border-faint px-4 py-6 text-center">
                  <Wrench className="mx-auto h-5 w-5 text-neutral-300" />
                  <p className="mt-2 text-[11px] text-neutral-500">No custom tools in this workspace.</p>
                  {canManageCustomTools && (
                    <button
                      type="button"
                      onClick={() => void openQuickAdd()}
                      className="mt-2 text-[11px] font-semibold text-accent-black underline-offset-2 hover:underline"
                    >
                      Add custom tool
                    </button>
                  )}
                </div>
              ) : (
                customAgentTools.map(({ custom, tool }) => (
                  <ToolRow
                    key={custom.id}
                    tool={tool}
                    badge={custom.kind === "http" ? "HTTP" : "MCP"}
                    attached={attachedTools.some((t) => t.name === tool.name)}
                    onToggle={() => onToggle(tool)}
                  />
                ))
              )}
            </div>
          )}
        </section>
      )}

      <p className="flex items-start gap-2 rounded-10 border border-border-faint bg-neutral-50/60 px-3 py-2 text-[10px] text-neutral-600 leading-relaxed">
        <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
        Tools run in the runtime loop with idempotency auditing. HTTP auth uses secrets from the
        vault.
      </p>

      <CustomToolsModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        workspaceId={workspaceId}
        tool={null}
        secretNames={secretNames}
        onSaved={(tool) => {
          onCustomToolsChange([tool, ...customTools.filter((t) => t.id !== tool.id)]);
          setQuickAddOpen(false);
        }}
      />

      <AgentToolsManageDrawer
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        workspaceId={workspaceId}
        canManage={canManageCustomTools}
        onToolsChange={onCustomToolsChange}
      />
    </div>
  );
}
