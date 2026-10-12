"use client";

import { useEffect, useState } from "react";
import { Globe, Plus, RotateCcw } from "lucide-react";
import { listPublishableKeys, revokePublishableKey } from "../lib/client";
import { formatDate } from "../lib/format";
import { CreatePublishableKeyModal } from "./create-publishable-key-modal";
import { AllowedOriginsModal } from "./allowed-origins-modal";
import { OneTimeKeyDialog } from "./one-time-key-dialog";
import { RevokeKeyModal } from "./revoke-key-modal";
import type {
  CreatePublishableKeyResult,
  PublishableKeyItem,
} from "../lib/types";

interface PublishableKeysSettingsProps {
  workspaceId: string;
  canManagePublishableKeys: boolean;
}

export function PublishableKeysSettings({
  workspaceId,
  canManagePublishableKeys,
}: PublishableKeysSettingsProps) {
  const [keys, setKeys] = useState<PublishableKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdKeyResult, setCreatedKeyResult] = useState<CreatePublishableKeyResult | null>(null);
  const [editingOriginsKey, setEditingOriginsKey] = useState<PublishableKeyItem | null>(null);
  const [revokingKey, setRevokingKey] = useState<PublishableKeyItem | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    const res = await listPublishableKeys(workspaceId);
    setIsLoading(false);

    if (res.publishableKeys) {
      setKeys(res.publishableKeys);
    } else {
      setError(res.error?.message || "Failed to load publishable keys.");
    }
  }

  useEffect(() => {
    void loadData();
  }, [workspaceId]);

  function handleKeyCreated(result: CreatePublishableKeyResult) {
    setKeys((prev) => [result, ...prev]);
    setCreatedKeyResult(result);
  }

  function handleOriginsUpdated(updated: PublishableKeyItem) {
    setKeys((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
  }

  async function handleRevokeConfirm() {
    if (!revokingKey) return { success: false, error: "No key selected." };
    const res = await revokePublishableKey(workspaceId, revokingKey.id);
    if (res.success) {
      setKeys((prev) =>
        prev.map((k) =>
          k.id === revokingKey.id
            ? { ...k, revoked_at: new Date().toISOString() }
            : k,
        ),
      );
      return { success: true };
    }
    return { success: false, error: res.error?.message || "Failed to revoke key." };
  }

  return (
    <div className="bg-white border border-border-faint rounded-14 p-6 sm:p-7 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-accent-black tracking-tight">
              Publishable Keys
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-600 border border-border-faint">
              Workspace-scoped
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Website widget keys and allowed origins.
          </p>
        </div>

        {canManagePublishableKeys && (
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors self-start shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create key</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-neutral-100 rounded-8" />
          <div className="h-10 bg-neutral-100 rounded-8" />
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
      ) : keys.length === 0 ? (
        <div className="p-10 border border-dashed border-border-faint rounded-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-500 mx-auto flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-accent-black">No publishable keys</p>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
              Create a publishable key to embed QuickStart AI agents into your external website or web application.
            </p>
          </div>
          {canManagePublishableKeys && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-neutral-100 hover:bg-neutral-200 text-accent-black text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create key</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-12 border border-border-faint">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-border-faint bg-neutral-50/70 text-[11px] font-semibold text-neutral-500 ">
                <th className="py-2.5 px-6 sm:px-7">Key Name & Prefix</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Allowed Origins</th>
                <th className="py-2.5 px-4">Created</th>
                <th className="py-2.5 px-6 sm:px-7 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint text-xs">
              {keys.map((k) => {
                const isRevoked = Boolean(k.revoked_at);
                return (
                  <tr
                    key={k.id}
                    className={`transition-colors ${
                      isRevoked ? "bg-neutral-50/40 opacity-75" : "hover:bg-neutral-50/50"
                    }`}
                  >
                    <td data-label="Name" className="py-3 px-6 sm:px-7">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-accent-black flex items-center gap-1.5">
                          <span>{k.name}</span>
                        </div>
                        <div className="font-mono text-[11px] text-neutral-400">
                          {k.key_prefix}...
                        </div>
                      </div>
                    </td>
                    <td data-label="Status" className="py-3 px-4">
                      {isRevoked ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                          Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td data-label="Allowed origins" className="py-3 px-4 max-w-xs">
                      {k.allowed_origins.length === 0 ? (
                        <span className="text-[11px] text-neutral-400 italic">No origins allowed</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {k.allowed_origins.map((origin) => (
                            <span
                              key={origin}
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-100 text-neutral-700 border border-border-faint truncate max-w-[200px]"
                              title={origin}
                            >
                              {origin}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td data-label="Created" className="py-3 px-4 text-neutral-500">
                      {formatDate(k.created_at)}
                    </td>
                    <td data-label="Actions" className="py-3 px-6 sm:px-7 text-right">
                      {canManagePublishableKeys ? (
                        <div className="inline-flex items-center gap-1">
                          {!isRevoked && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingOriginsKey(k)}
                                className="px-2.5 py-1 rounded-6 text-neutral-600 hover:text-accent-black hover:bg-neutral-100 text-[11px] font-medium transition-colors"
                              >
                                Edit origins
                              </button>
                              <button
                                type="button"
                                onClick={() => setRevokingKey(k)}
                                className="px-2.5 py-1 rounded-6 text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-medium transition-colors"
                              >
                                Revoke
                              </button>
                            </>
                          )}
                          {isRevoked && (
                            <span className="text-[11px] text-neutral-400 italic">Revoked</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-400 italic">Read-only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreatePublishableKeyModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        workspaceId={workspaceId}
        onKeyCreated={handleKeyCreated}
      />

      {editingOriginsKey && (
        <AllowedOriginsModal
          open={Boolean(editingOriginsKey)}
          onClose={() => setEditingOriginsKey(null)}
          workspaceId={workspaceId}
          publishableKey={editingOriginsKey}
          onOriginsUpdated={handleOriginsUpdated}
        />
      )}

      {revokingKey && (
        <RevokeKeyModal
          open={Boolean(revokingKey)}
          onClose={() => setRevokingKey(null)}
          keyName={revokingKey.name}
          isPublishableKey={true}
          onRevoke={handleRevokeConfirm}
        />
      )}

      {createdKeyResult && (
        <OneTimeKeyDialog
          open={Boolean(createdKeyResult)}
          onClose={() => setCreatedKeyResult(null)}
          title="Publishable key created"
          keyLabel="Publishable key"
          rawKey={createdKeyResult.publishable_key}
          description="Copy your publishable key. You can also view its prefix later, but the full key cannot be shown again."
        />
      )}
    </div>
  );
}
