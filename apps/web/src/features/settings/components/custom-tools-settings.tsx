"use client";

import { useEffect, useState } from "react";
import { Globe, Plus, RotateCcw, Server, Trash2, Wrench } from "lucide-react";
import { deleteCustomTool, listCustomTools, listSecrets } from "../lib/client";
import { formatDate } from "../lib/format";
import { CustomToolsModal } from "./custom-tools-modal";
import { SettingsDialog } from "./settings-dialog";
import type { CustomToolItem } from "../lib/types";

interface CustomToolsSettingsProps {
  workspaceId: string;
  canManageCustomTools: boolean;
}

export function CustomToolsSettings({
  workspaceId,
  canManageCustomTools,
}: CustomToolsSettingsProps) {
  const [tools, setTools] = useState<CustomToolItem[]>([]);
  const [secretNames, setSecretNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<CustomToolItem | null>(null);
  const [deletingTool, setDeletingTool] = useState<CustomToolItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    const [toolsRes, secretsRes] = await Promise.all([
      listCustomTools(workspaceId),
      listSecrets(workspaceId),
    ]);
    setIsLoading(false);
    if (toolsRes.tools) {
      setTools(toolsRes.tools);
    } else {
      setError(toolsRes.error?.message || "Failed to load custom tools.");
    }
    setSecretNames((secretsRes.secrets ?? []).map((s) => s.name));
  }

  useEffect(() => {
    void loadData();
  }, [workspaceId]);

  function handleSaved(tool: CustomToolItem) {
    setTools((prev) => {
      const idx = prev.findIndex((t) => t.id === tool.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = tool;
        return copy;
      }
      return [tool, ...prev];
    });
  }

  async function handleDelete() {
    if (!deletingTool || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteCustomTool(workspaceId, deletingTool.id);
    setIsDeleting(false);
    if (res.success) {
      setTools((prev) => prev.filter((t) => t.id !== deletingTool.id));
      setDeletingTool(null);
    } else {
      setDeleteError(res.error?.message || "Failed to delete tool.");
    }
  }

  function openCreate() {
    setEditingTool(null);
    setModalOpen(true);
  }

  function openEdit(tool: CustomToolItem) {
    setEditingTool(tool);
    setModalOpen(true);
  }

  function kindBadge(tool: CustomToolItem) {
    return tool.kind === "http" ? (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
        HTTP
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        MCP
      </span>
    );
  }

  function target(tool: CustomToolItem): string {
    if (tool.kind === "http") return String(tool.config.base_url ?? "");
    return String(tool.config.server_url ?? "");
  }

  return (
    <div className="bg-white border border-border-faint rounded-14 p-6 sm:p-7 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-accent-black tracking-tight">Custom tools</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-600 border border-border-faint">
              Workspace-scoped
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Connect your own HTTP APIs and MCP servers, then attach them to agents on the Tools tab.
          </p>
        </div>

        {canManageCustomTools && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors self-start shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add tool</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-12 bg-neutral-100 rounded-8" />
          <div className="h-12 bg-neutral-100 rounded-8" />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-12 text-center space-y-2">
          <p className="text-xs text-red-600 font-medium">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-white border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : tools.length === 0 ? (
        <div className="p-10 border border-dashed border-border-faint rounded-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-500 mx-auto flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-accent-black">No custom tools yet</p>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
              Define an HTTP API or MCP server once, and any agent in this workspace can call it.
            </p>
          </div>
          {canManageCustomTools && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-neutral-100 hover:bg-neutral-200 text-accent-black text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add tool</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-12 border border-border-faint hover:border-border-muted transition-colors"
            >
              <div className="w-9 h-9 rounded-10 bg-heat-12/40 text-heat-100 flex items-center justify-center shrink-0">
                {tool.kind === "http" ? (
                  <Globe className="w-4 h-4" />
                ) : (
                  <Server className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-accent-black">
                    {tool.name}
                  </span>
                  {kindBadge(tool)}
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  {tool.description || "No description"}
                </p>
                <p className="text-[11px] text-neutral-400 font-mono truncate">{target(tool)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-neutral-400">
                  Updated {formatDate(tool.updated_at)}
                </span>
                {canManageCustomTools ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(tool)}
                      className="px-2.5 py-1 rounded-6 text-neutral-600 hover:text-accent-black hover:bg-neutral-100 text-[11px] font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTool(tool)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-6 text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-medium transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-neutral-400 italic">Read-only</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CustomToolsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceId={workspaceId}
        tool={editingTool}
        secretNames={secretNames}
        onSaved={handleSaved}
      />

      {deletingTool && (
        <SettingsDialog
          open={Boolean(deletingTool)}
          onClose={() => setDeletingTool(null)}
          title="Delete custom tool"
          maxWidthClass="max-w-[420px]"
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Delete{" "}
              <span className="font-mono font-semibold text-accent-black">{deletingTool.name}</span>
              ? Agents that already attached it keep their published copy; only the workspace
              definition is removed.
            </p>
            {deleteError ? (
              <div
                role="alert"
                className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson"
              >
                {deleteError}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTool(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-8 border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-8 bg-red-600 text-white hover:bg-red-700 text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete tool"}
              </button>
            </div>
          </div>
        </SettingsDialog>
      )}
    </div>
  );
}
