"use client";

import { useEffect, useState } from "react";
import { Globe, Pencil, Plus, Server, Trash2, X } from "lucide-react";
import { CustomToolsModal } from "@/features/settings/components/custom-tools-modal";
import { SettingsDialog } from "@/features/settings/components/settings-dialog";
import { deleteCustomTool, listCustomTools, listSecrets } from "@/features/settings/lib/client";
import { formatDate } from "@/features/settings/lib/format";
import type { CustomToolItem } from "@/features/settings/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  canManage: boolean;
  onToolsChange: (tools: CustomToolItem[]) => void;
};

export function AgentToolsManageDrawer({
  open,
  onClose,
  workspaceId,
  canManage,
  onToolsChange,
}: Props) {
  const [tools, setTools] = useState<CustomToolItem[]>([]);
  const [secretNames, setSecretNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomToolItem | null>(null);
  const [deleting, setDeleting] = useState<CustomToolItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, workspaceId]);

  async function load() {
    setLoading(true);
    setError(null);
    const [toolsRes, secretsRes] = await Promise.all([
      listCustomTools(workspaceId),
      listSecrets(workspaceId),
    ]);
    setLoading(false);
    if (toolsRes.tools) {
      setTools(toolsRes.tools);
      onToolsChange(toolsRes.tools);
    } else {
      setError(toolsRes.error?.message || "Failed to load custom tools.");
    }
    setSecretNames((secretsRes.secrets ?? []).map((s) => s.name));
  }

  function handleSaved(tool: CustomToolItem) {
    setTools((prev) => {
      const idx = prev.findIndex((t) => t.id === tool.id);
      const next = idx >= 0 ? prev.map((t, i) => (i === idx ? tool : t)) : [tool, ...prev];
      onToolsChange(next);
      return next;
    });
    setModalOpen(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const res = await deleteCustomTool(workspaceId, deleting.id);
    setDeleteBusy(false);
    if (res.success) {
      setTools((prev) => {
        const next = prev.filter((t) => t.id !== deleting.id);
        onToolsChange(next);
        return next;
      });
      setDeleting(null);
    } else {
      setDeleteError(res.error?.message || "Failed to delete tool.");
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border-faint bg-white shadow-xl animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-label="Manage workspace tools"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border-faint px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-accent-black tracking-tight">Workspace tools</h2>
            <p className="mt-0.5 text-[11px] text-neutral-500 leading-relaxed">
              Create HTTP and MCP tools here, then attach them to this agent.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-8 p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-accent-black"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center justify-between gap-2 border-b border-border-faint px-5 py-3">
          <span className="text-[11px] font-semibold text-neutral-500">
            {tools.length} custom {tools.length === 1 ? "tool" : "tools"}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-2.5 py-1.5 text-[11px] font-semibold text-accent-black hover:bg-neutral-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add custom tool
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-xs text-neutral-400">Loading tools…</p>
          ) : error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : tools.length === 0 ? (
            <div className="rounded-12 border border-dashed border-border-faint px-4 py-8 text-center">
              <p className="text-xs text-neutral-500">No custom tools yet.</p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setModalOpen(true);
                  }}
                  className="mt-3 text-[11px] font-semibold text-accent-black underline-offset-2 hover:underline"
                >
                  Create your first tool
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {tools.map((tool) => (
                <li
                  key={tool.id}
                  className="rounded-10 border border-border-faint bg-neutral-50/40 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-accent-black">
                          {tool.name}
                        </span>
                        {tool.kind === "http" ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-border-faint bg-white px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">
                            <Globe className="h-2.5 w-2.5" />
                            HTTP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-border-faint bg-white px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">
                            <Server className="h-2.5 w-2.5" />
                            MCP
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-600">
                        {tool.description || "No description"}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-neutral-400">
                        Updated {formatDate(tool.updated_at)}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(tool);
                            setModalOpen(true);
                          }}
                          className="rounded-6 p-1.5 text-neutral-500 hover:bg-white hover:text-accent-black"
                          aria-label={`Edit ${tool.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(tool)}
                          className="rounded-6 p-1.5 text-neutral-500 hover:bg-white hover:text-red-600"
                          aria-label={`Delete ${tool.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <CustomToolsModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        workspaceId={workspaceId}
        tool={editing}
        secretNames={secretNames}
        onSaved={handleSaved}
      />

      {deleting && (
        <SettingsDialog
          open={Boolean(deleting)}
          onClose={() => !deleteBusy && setDeleting(null)}
          title="Delete custom tool"
          maxWidthClass="max-w-[420px]"
          isSubmitting={deleteBusy}
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 leading-relaxed">
              Delete{" "}
              <span className="font-mono font-semibold text-accent-black">{deleting.name}</span>? The
              workspace definition is removed; published agent snapshots are unchanged until you
              publish again.
            </p>
            {deleteError ? (
              <div
                role="alert"
                className="rounded-10 border border-red-200 bg-red-50 p-3 text-xs text-accent-crimson"
              >
                {deleteError}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
                className="rounded-8 border border-neutral-200 px-3.5 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteBusy}
                className="rounded-8 bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteBusy ? "Deleting…" : "Delete tool"}
              </button>
            </div>
          </div>
        </SettingsDialog>
      )}
    </>
  );
}
