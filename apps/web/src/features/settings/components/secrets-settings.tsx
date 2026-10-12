"use client";

import { useEffect, useState } from "react";
import { Lock, Plus, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { listSecrets } from "../lib/client";
import { formatDate } from "../lib/format";
import { AddSecretModal } from "./add-secret-modal";
import { RotateSecretModal } from "./rotate-secret-modal";
import { DeleteSecretModal } from "./delete-secret-modal";
import type { SecretItem } from "../lib/types";

interface SecretsSettingsProps {
  workspaceId: string;
  canManageSecrets: boolean;
}

export function SecretsSettings({
  workspaceId,
  canManageSecrets,
}: SecretsSettingsProps) {
  const [secrets, setSecrets] = useState<SecretItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [rotatingSecret, setRotatingSecret] = useState<SecretItem | null>(null);
  const [deletingSecret, setDeletingSecret] = useState<SecretItem | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    const res = await listSecrets(workspaceId);
    setIsLoading(false);

    if (res.secrets) {
      setSecrets(res.secrets);
    } else {
      setError(res.error?.message || "Failed to load secrets.");
    }
  }

  useEffect(() => {
    void loadData();
  }, [workspaceId]);

  function handleSecretSaved(newSecret: SecretItem) {
    setSecrets((prev) => {
      const idx = prev.findIndex((s) => s.name === newSecret.name);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newSecret;
        return copy;
      }
      return [newSecret, ...prev];
    });
  }

  function handleSecretRotated(updated: SecretItem) {
    setSecrets((prev) =>
      prev.map((s) => (s.name === updated.name ? updated : s)),
    );
  }

  function handleSecretDeleted(name: string) {
    setSecrets((prev) => prev.filter((s) => s.name !== name));
  }

  return (
    <div className="bg-white border border-border-faint rounded-14 p-6 sm:p-7 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-accent-black tracking-tight">
              Secrets Vault
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-600 border border-border-faint">
              Workspace-scoped
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Secret names only. Stored values are never displayed.
          </p>
        </div>

        {canManageSecrets && (
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors self-start shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add secret</span>
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
      ) : secrets.length === 0 ? (
        <div className="p-10 border border-dashed border-border-faint rounded-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-500 mx-auto flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-accent-black">No secrets configured</p>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
              Add API credentials, tokens, or private keys needed by agents running in this workspace.
            </p>
          </div>
          {canManageSecrets && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-neutral-100 hover:bg-neutral-200 text-accent-black text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add secret</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-12 border border-border-faint">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-border-faint bg-neutral-50/70 text-[11px] font-semibold text-neutral-500 ">
                <th className="py-2.5 px-6 sm:px-7">Secret Name</th>
                <th className="py-2.5 px-4">Last Updated</th>
                <th className="py-2.5 px-6 sm:px-7 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint text-xs">
              {secrets.map((secret) => (
                <tr key={secret.id || secret.name} className="hover:bg-neutral-50/50 transition-colors">
                  <td data-label="Name" className="py-3 px-6 sm:px-7">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="font-mono text-[12px] font-semibold text-accent-black">
                        {secret.name}
                      </span>
                    </div>
                  </td>
                  <td data-label="Updated" className="py-3 px-4 text-neutral-500">
                    {formatDate(secret.updated_at || secret.created_at)}
                  </td>
                  <td data-label="Actions" className="py-3 px-6 sm:px-7 text-right">
                    {canManageSecrets ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRotatingSecret(secret)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-6 text-neutral-600 hover:text-accent-black hover:bg-neutral-100 text-[11px] font-medium transition-colors"
                          title="Re-encrypt secret with current master key"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Rotate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSecret(secret)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-6 text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] font-medium transition-colors"
                          title="Delete secret"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">Read-only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <AddSecretModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        workspaceId={workspaceId}
        existingSecretNames={secrets.map((s) => s.name)}
        onSecretSaved={handleSecretSaved}
      />

      {rotatingSecret && (
        <RotateSecretModal
          open={Boolean(rotatingSecret)}
          onClose={() => setRotatingSecret(null)}
          workspaceId={workspaceId}
          secret={rotatingSecret}
          onRotated={handleSecretRotated}
        />
      )}

      {deletingSecret && (
        <DeleteSecretModal
          open={Boolean(deletingSecret)}
          onClose={() => setDeletingSecret(null)}
          workspaceId={workspaceId}
          secret={deletingSecret}
          onDeleted={handleSecretDeleted}
        />
      )}
    </div>
  );
}
