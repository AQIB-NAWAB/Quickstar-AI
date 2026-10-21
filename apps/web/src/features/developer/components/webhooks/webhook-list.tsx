"use client";

import {
  CheckCircle2,
  Eye,
  KeyRound,
  Loader2,
  Plus,
  Trash2,
  Webhook as WebhookIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getWebhooksRepository } from "../../lib/repository";
import type { WebhookEndpoint } from "../../lib/types";
import { DeveloperSubnav } from "../developer-subnav";
import { DeliveryDetail } from "./delivery-detail";
import { SigningSecretDialog } from "./signing-secret-dialog";
import { WebhookRegistration } from "./webhook-registration";

interface WebhookListProps {
  workspaceId: string;
  isPreview?: boolean;
}

export function WebhookList({
  workspaceId,
  isPreview = false,
}: WebhookListProps) {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [displaySecret, setDisplaySecret] = useState<string | null>(null);

  const repo = getWebhooksRepository(isPreview);

  const loadEndpoints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await repo.listEndpoints(workspaceId);
      if (res.status === "ready") {
        setEndpoints(res.data);
        if (res.data.length > 0 && !selectedEndpoint) {
          setSelectedEndpoint(res.data[0]);
        }
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhook endpoints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEndpoints();
  }, [workspaceId, isPreview]);

  const handleRegisterSuccess = (data: { endpoint: WebhookEndpoint; secret: string }) => {
    setEndpoints((prev) => [data.endpoint, ...prev]);
    setSelectedEndpoint(data.endpoint);
    setIsRegisterOpen(false);
    setDisplaySecret(data.secret);
  };

  const handleRotateSecret = async (endpoint: WebhookEndpoint) => {
    if (!repo.rotateSecret) return;
    const confirmed = window.confirm(
      `Are you sure you want to rotate the signing secret for ${endpoint.url}? Any in-flight payloads will fail signature verification until updated in your listener.`
    );
    if (!confirmed) return;

    const res = await repo.rotateSecret(workspaceId, endpoint.id);
    if (res.status === "ready") {
      setDisplaySecret(res.data.signingSecret);
    } else {
      alert(res.message);
    }
  };

  const handleDeleteEndpoint = async (endpoint: WebhookEndpoint) => {
    if (!repo.deleteEndpoint) return;
    const confirmed = window.confirm(`Delete webhook endpoint ${endpoint.url}? This action cannot be undone.`);
    if (!confirmed) return;

    const res = await repo.deleteEndpoint(workspaceId, endpoint.id);
    if (res.status === "ready") {
      setEndpoints((prev) => prev.filter((e) => e.id !== endpoint.id));
      if (selectedEndpoint?.id === endpoint.id) {
        setSelectedEndpoint(null);
      }
    } else {
      alert(res.message);
    }
  };

  function renderHealthIndicator(ep: WebhookEndpoint) {
    if (ep.consecutiveFailures && ep.consecutiveFailures > 0) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#B42318]">
          <span className="w-2 h-2 rounded-full bg-[#B42318] shrink-0" />
          <span>
            {ep.consecutiveFailures} failed {ep.consecutiveFailures === 1 ? "attempt" : "attempts"}
            {ep.lastDeliveryStatus ? ` · HTTP ${ep.lastDeliveryStatus}` : ""}
          </span>
        </div>
      );
    }
    if (ep.lastDeliveryStatus && ep.lastDeliveryStatus >= 200 && ep.lastDeliveryStatus < 300) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#027A48]">
          <span className="w-2 h-2 rounded-full bg-[#027A48] shrink-0" />
          <span>Healthy · HTTP {ep.lastDeliveryStatus}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
        <span className="w-2 h-2 rounded-full bg-[#A1A1AA] shrink-0" />
        <span>No deliveries yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header matching Image 6 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#18181B]">
              Webhooks
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E9F9EF] text-[#027A48] border border-[#A6F4C5]">
              <CheckCircle2 className="w-3 h-3" />
              HMAC-SHA256 Signed
            </span>
            {isPreview && (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-[#FF571A] border border-orange-200">
                Sample preview
              </span>
            )}
          </div>
          <p className="text-xs text-[#71717A] mt-1">
            Receive real-time signed HTTP POST event payloads when activities occur in your workspace.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-8 bg-[#FF571A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#E0460D] transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register webhook</span>
        </button>
      </div>

      <DeveloperSubnav workspaceId={workspaceId} isPreview={isPreview} />

      {/* Main Grid: Webhook Endpoints List + Delivery Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Endpoints Table Container */}
        <div
          className={`${
            selectedEndpoint ? "min-w-0 lg:col-span-7 xl:col-span-7" : "lg:col-span-12"
          } space-y-4`}
        >
          <div className="rounded-12 border border-[#EAECF0] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#18181B]">
                  Active Endpoints ({endpoints.length})
                </h2>
                <p className="text-[11px] text-[#71717A] mt-0.5">
                  Endpoints listening for asynchronous event dispatches.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-[#71717A] space-y-2">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#FF571A]" />
                <p className="text-xs">Loading webhook subscriptions...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-8 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs">
                {error}
              </div>
            ) : endpoints.length === 0 ? (
              <div className="p-12 text-center text-[#71717A] bg-[#F8F9FB] rounded-8 border border-[#EAECF0] space-y-2">
                <WebhookIcon className="w-8 h-8 text-[#A1A1AA] mx-auto mb-1" />
                <h3 className="text-sm font-bold text-[#18181B]">No webhooks registered</h3>
                <p className="text-xs">
                  Click &ldquo;Register webhook&rdquo; to connect an external receiver for workspace notifications.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-8 border border-[#EAECF0]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8F9FB] text-[11px] font-semibold text-[#71717A] border-b border-[#EAECF0]">
                    <tr>
                      <th className="px-3.5 py-2.5">Endpoint URL</th>
                      <th className="px-3.5 py-2.5">Subscribed Events</th>
                      <th className="px-3.5 py-2.5">Health &amp; Status</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAECF0]">
                    {endpoints.map((ep) => {
                      const isSelected = selectedEndpoint?.id === ep.id;

                      return (
                        <tr
                          key={ep.id}
                          onClick={() => setSelectedEndpoint(ep)}
                          className={`cursor-pointer transition-colors hover:bg-[#F8F9FB] ${
                            isSelected
                              ? "bg-[#FFF4ED]/40 border-l-4 border-l-[#FF571A]"
                              : "border-l-4 border-l-transparent"
                          }`}
                        >
                          <td className="px-3.5 py-3 font-mono font-semibold text-[#18181B] max-w-[220px] truncate">
                            {ep.url}
                          </td>

                          <td className="px-3.5 py-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {ep.events.map((ev) => (
                                <span
                                  key={ev}
                                  className="font-mono text-[10px] bg-[#F8F9FB] border border-[#EAECF0] px-1.5 py-0.2 rounded text-[#52525B]"
                                >
                                  {ev}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-3.5 py-3 whitespace-nowrap">
                            {renderHealthIndicator(ep)}
                          </td>

                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEndpoint(ep);
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-6 text-xs font-semibold transition-colors ${
                                  isSelected
                                    ? "bg-[#FF571A] text-white"
                                    : "bg-[#F8F9FB] hover:bg-[#EAECF0] text-[#18181B]"
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRotateSecret(ep);
                                }}
                                className="p-1 text-[#71717A] hover:text-[#18181B] rounded hover:bg-[#F8F9FB]"
                                title="Rotate signing secret"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEndpoint(ep);
                                }}
                                className="p-1 text-[#71717A] hover:text-[#B42318] rounded hover:bg-[#FEF3F2]"
                                title="Delete endpoint"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Drawer: Delivery Trace and Redrive matching Image 6 */}
        {selectedEndpoint && (
          <div className="min-w-0 lg:col-span-5 xl:col-span-5 sticky top-6">
            <DeliveryDetail
              workspaceId={workspaceId}
              endpoint={selectedEndpoint}
              isPreview={isPreview}
              onClose={() => setSelectedEndpoint(null)}
            />
          </div>
        )}
      </div>

      {/* Registration Modal */}
      <WebhookRegistration
        workspaceId={workspaceId}
        isPreview={isPreview}
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      {/* Signing Secret Dialog */}
      <SigningSecretDialog
        secret={displaySecret || ""}
        isOpen={Boolean(displaySecret)}
        onClose={() => setDisplaySecret(null)}
      />
    </div>
  );
}
