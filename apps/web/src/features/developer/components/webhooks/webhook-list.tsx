"use client";

import { ArrowRight,Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SAMPLE_WEBHOOK_ENDPOINTS } from "../../lib/fixtures";
import { type WebhookEndpoint } from "../../lib/types";
import { DeveloperSubnav } from "../developer-subnav";
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
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(
    SAMPLE_WEBHOOK_ENDPOINTS
  );
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const basePath = isPreview
    ? "/preview/developer"
    : `/workspaces/${workspaceId}/developer`;

  const handleRegisterSuccess = (data: {
    url: string;
    events: string[];
    secret: string;
  }) => {
    const newEp: WebhookEndpoint = {
      id: `wh_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId,
      url: data.url,
      events: data.events,
      status: "active",
      lastDeliveryAt: null,
      createdAt: new Date().toISOString(),
    };
    setEndpoints([newEp, ...endpoints]);
    setIsRegisterOpen(false);
    setCreatedSecret(data.secret);
  };

  const formatLastDelivery = (iso: string | null) => {
    if (!iso) return "Never";
    // Oct 10, 14:22
    const d = new Date(iso);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = months[d.getUTCMonth()];
    const day = d.getUTCDate();
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const mins = String(d.getUTCMinutes()).padStart(2, "0");
    return `${month} ${day}, ${hours}:${mins}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#262626]">
              Developer portal
            </h1>
            {isPreview && (
              <span className="rounded bg-[#fa5d19]/10 px-2 py-0.5 text-xs font-semibold text-[#fa5d19]">
                Sample data
              </span>
            )}
          </div>
          <p className="text-sm text-[#737373] mt-1">
            Integrate through the public API and inspect webhook delivery.
          </p>
        </div>
      </div>

      <DeveloperSubnav workspaceId={workspaceId} isPreview={isPreview} />

      {/* Main Table Card */}
      <div className="rounded-xl border border-[#ededed] bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-[#262626]">
              Webhook endpoints
            </h2>
            <span className="font-mono text-xs text-[#a3a3a3]">
              /developer/webhooks
            </span>
          </div>

          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#fa5d19] px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Register endpoint</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-[#ededed]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f9f9f9] text-[11px] font-medium text-[#737373]">
              <tr>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last delivery</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ededed]">
              {endpoints.map((ep) => (
                <tr
                  key={ep.id}
                  className="hover:bg-[#f9f9f9]/80 transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-medium text-[#262626]">
                    {ep.url}
                  </td>
                  <td className="px-4 py-3 text-[#737373]">
                    {ep.events.length} event{ep.events.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3">
                    {ep.status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#737373] tabular-nums">
                    {formatLastDelivery(ep.lastDeliveryAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`${basePath}/webhooks/${ep.id}/deliveries/dlv_1042`}
                      className="inline-flex items-center gap-1 font-medium text-[#fa5d19] hover:underline"
                    >
                      <span>View deliveries</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[#a3a3a3]">
          Illustrative endpoints · Delivery service not connected.
        </p>
      </div>

      {/* Registration Modal */}
      <WebhookRegistration
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      {/* Signing Secret Dialog */}
      <SigningSecretDialog
        secret={createdSecret || "example_secret_not_valid"}
        isOpen={Boolean(createdSecret)}
        onClose={() => setCreatedSecret(null)}
      />
    </div>
  );
}
