"use client";

import { useEffect, useState } from "react";
import { Key, Plus, RotateCcw } from "lucide-react";
import { listApiKeys, revokeApiKey } from "../lib/client";
import { formatDate } from "../lib/format";
import { CreateApiKeyModal } from "./create-api-key-modal";
import { OneTimeKeyDialog } from "./one-time-key-dialog";
import { RevokeKeyModal } from "./revoke-key-modal";
import type { ApiKeyItem, CreateApiKeyResult } from "../lib/types";

interface ApiKeysSettingsProps {
  orgId: string;
}

export function ApiKeysSettings({ orgId }: ApiKeysSettingsProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdKeyResult, setCreatedKeyResult] = useState<CreateApiKeyResult | null>(null);
  const [revokingKey, setRevokingKey] = useState<ApiKeyItem | null>(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    const res = await listApiKeys(orgId);
    setIsLoading(false);

    if (res.apiKeys) {
      setKeys(res.apiKeys);
    } else {
      setError(res.error?.message || "Failed to load API keys.");
    }
  }

  useEffect(() => {
    void loadData();
  }, [orgId]);

  function handleKeyCreated(result: CreateApiKeyResult) {
    setKeys((prev) => [
      {
        id: result.id,
        name: result.name,
        key_prefix: result.key_prefix,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setCreatedKeyResult(result);
  }

  async function handleRevokeConfirm() {
    if (!revokingKey) return { success: false, error: "No key selected." };
    const res = await revokeApiKey(orgId, revokingKey.id);
    if (res.success) {
      setKeys((prev) => prev.filter((k) => k.id !== revokingKey.id));
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
              API Keys
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-600 border border-border-faint">
              Organization-wide
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            These keys apply to your organization.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors self-start shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create key</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-neutral-100 rounded-8" />
          <div className="h-10 bg-neutral-100 rounded-8" />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-12 text-center space-y-2">
          <p className="text-xs font-semibold text-accent-crimson">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 bg-white border border-border-faint text-xs font-semibold text-accent-black hover:bg-neutral-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : keys.length === 0 ? (
        <div className="p-10 text-center space-y-2">
          <Key className="w-8 h-8 text-neutral-300 mx-auto" />
          <p className="text-xs font-semibold text-accent-black">No API keys created yet</p>
          <p className="text-xs text-neutral-400">Create an API key to access platform APIs programmatically.</p>
        </div>
      ) : (
        <div className="border border-border-faint rounded-12 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/60 text-neutral-500 font-medium">
                  <th scope="col" className="py-3 px-4 font-semibold">Name</th>
                  <th scope="col" className="py-3 px-4 font-semibold">Key</th>
                  <th scope="col" className="py-3 px-4 font-semibold">Created</th>
                  <th scope="col" className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-heat-8/30 transition-colors">
                    <td data-label="Name" className="py-3.5 px-4 font-semibold text-accent-black">
                      {key.name}
                    </td>
                    <td data-label="Key" className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-neutral-500 text-xs">
                        <span>••••</span>
                        <span className="text-[10px] text-neutral-400 font-sans italic">
                          (Last four unavailable)
                        </span>
                      </div>
                    </td>
                    <td data-label="Created" className="py-3.5 px-4 whitespace-nowrap text-neutral-500">
                      {formatDate(key.created_at)}
                    </td>
                    <td data-label="Actions" className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setRevokingKey(key)}
                        className="px-2.5 py-1 rounded-8 border border-red-200 bg-white hover:bg-red-50 text-accent-crimson text-xs font-semibold transition-colors"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      <CreateApiKeyModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        orgId={orgId}
        onKeyCreated={handleKeyCreated}
      />

      {/* One-Time Key Reveal Dialog */}
      {createdKeyResult ? (
        <OneTimeKeyDialog
          open={Boolean(createdKeyResult)}
          onClose={() => setCreatedKeyResult(null)}
          title="Copy your key now"
          keyLabel="API key"
          rawKey={createdKeyResult.api_key}
          description="This organization API key will not be shown again. Store it securely."
        />
      ) : null}

      {/* Revoke Key Modal */}
      {revokingKey ? (
        <RevokeKeyModal
          open={Boolean(revokingKey)}
          onClose={() => setRevokingKey(null)}
          keyName={revokingKey.name}
          onRevoke={handleRevokeConfirm}
        />
      ) : null}
    </div>
  );
}
