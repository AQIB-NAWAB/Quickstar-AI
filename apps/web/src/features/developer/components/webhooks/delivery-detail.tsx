"use client";

import {
AlertCircle,
ArrowLeft,
Check,
Copy,
RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SAMPLE_DELIVERY_1042 } from "../../lib/fixtures";
import { type WebhookDelivery } from "../../lib/types";
import { DeveloperSubnav } from "../developer-subnav";
import { RedriveDialog } from "./redrive-dialog";

interface DeliveryDetailProps {
  workspaceId: string;
  webhookId?: string;
  deliveryId?: string;
  isPreview?: boolean;
}

export function DeliveryDetail({
  workspaceId,
  deliveryId = "dlv_1042",
  isPreview = false,
}: DeliveryDetailProps) {
  const [delivery, setDelivery] = useState<WebhookDelivery>(SAMPLE_DELIVERY_1042);
  const [activeTab, setActiveTab] = useState<"request" | "response" | "attempts">(
    "request"
  );
  const [copied, setCopied] = useState(false);
  const [isRedriveOpen, setIsRedriveOpen] = useState(false);

  const basePath = isPreview
    ? "/preview/developer"
    : `/workspaces/${workspaceId}/developer`;

  const requestBodyFormatted = JSON.stringify(delivery.request.body, null, 2);

  const handleCopyRequest = () => {
    navigator.clipboard.writeText(requestBodyFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedriveConfirm = () => {
    const nextAttemptNum = delivery.attempt + 1;
    const newAttempt = {
      attemptNumber: nextAttemptNum,
      occurredAt: new Date().toISOString(),
      httpStatus: 200,
      latencyMs: 145,
      outcome: "success" as const,
    };

    setDelivery({
      ...delivery,
      attempt: nextAttemptNum,
      httpStatus: 200,
      latencyMs: 145,
      outcome: "success",
      error: undefined,
      attemptsHistory: [...(delivery.attemptsHistory || []), newAttempt],
    });
    setActiveTab("attempts");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
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

      {/* Main Delivery Trace Card */}
      <div className="rounded-xl border border-[#ededed] bg-white p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#ededed] pb-4">
          <div className="flex items-center gap-3">
            <Link
              href={`${basePath}/webhooks`}
              className="rounded-lg border border-[#ededed] p-1.5 text-[#737373] hover:text-[#262626] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#262626]">
                  Delivery details · {deliveryId}
                </h2>
                {delivery.outcome === "failed" ? (
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    Failed
                  </span>
                ) : (
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    Success
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsRedriveOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#ededed] bg-white px-3 py-1.5 text-xs font-medium text-[#262626] hover:border-[#fa5d19] hover:text-[#fa5d19] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Redrive delivery</span>
          </button>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[#a3a3a3]">Event</span>
            <p className="font-mono font-medium text-[#262626] mt-0.5">
              {delivery.eventType}
            </p>
          </div>
          <div>
            <span className="text-[#a3a3a3]">Attempt</span>
            <p className="font-mono font-medium text-[#262626] mt-0.5">
              {delivery.attempt}
            </p>
          </div>
          <div>
            <span className="text-[#a3a3a3]">HTTP status</span>
            <p className="font-mono font-medium text-[#262626] mt-0.5">
              {delivery.httpStatus || "—"}
            </p>
          </div>
          <div>
            <span className="text-[#a3a3a3]">Latency</span>
            <p className="font-mono font-medium text-[#262626] mt-0.5">
              {delivery.latencyMs} ms
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-[#ededed] text-xs">
          <button
            onClick={() => setActiveTab("request")}
            className={`pb-2 font-medium transition-colors relative ${
              activeTab === "request"
                ? "text-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            Request
            {activeTab === "request" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fa5d19]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("response")}
            className={`pb-2 font-medium transition-colors relative ${
              activeTab === "response"
                ? "text-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            Response
            {activeTab === "response" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fa5d19]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("attempts")}
            className={`pb-2 font-medium transition-colors relative ${
              activeTab === "attempts"
                ? "text-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            Attempts ({delivery.attemptsHistory?.length || 1})
            {activeTab === "attempts" && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#fa5d19]" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "request" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="min-w-0 space-y-3 lg:col-span-2">
            <div className="text-xs font-semibold text-[#737373]">Request body</div>
            <div className="relative rounded-lg border border-[#ededed] bg-[#f9f9f9] p-4 font-mono text-xs text-[#262626]">
              <pre className="overflow-x-auto whitespace-pre">
                {requestBodyFormatted}
              </pre>
              <button
                onClick={handleCopyRequest}
                className="absolute top-3 right-3 flex items-center gap-1 rounded border border-[#ededed] bg-white px-2 py-1 text-[11px] text-[#737373] hover:text-[#262626] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-[#fa5d19]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-[11px] text-[#a3a3a3]">
              Signature: [redacted]
            </p>
            </div>
            {delivery.outcome === "failed" && <aside className="space-y-3">
              <h3 className="text-xs font-semibold text-neutral-700">Error</h3>
              <div className="rounded-8 border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1">
                <p className="font-semibold">HTTP {delivery.httpStatus ?? "error"}</p>
                <p>{delivery.error || "The destination did not accept this delivery."}</p>
              </div>
              <p className="text-xs text-neutral-500">Redrive creates another attempt; previous delivery records remain.</p>
            </aside>}
          </div>
        )}

        {activeTab === "response" && (
          <div className="space-y-4">
            {delivery.outcome === "failed" ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>503 Service Unavailable</span>
                </div>
                <p className="text-xs text-red-600 pl-6">
                  Destination temporarily unavailable.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-green-700">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>200 OK — Delivery Acknowledged</span>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3 text-xs text-[#737373]">
              Redrive creates another attempt; previous delivery records remain.
            </div>
          </div>
        )}

        {activeTab === "attempts" && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-[#ededed]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f9f9f9] text-[11px] font-medium text-[#737373]">
                  <tr>
                    <th className="px-4 py-2.5">Attempt</th>
                    <th className="px-4 py-2.5">Time (UTC)</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Latency</th>
                    <th className="px-4 py-2.5">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ededed]">
                  {delivery.attemptsHistory?.map((att) => (
                    <tr key={att.attemptNumber}>
                      <td className="px-4 py-2.5 font-mono font-medium text-[#262626]">
                        #{att.attemptNumber}
                      </td>
                      <td className="px-4 py-2.5 text-[#737373] tabular-nums">
                        {att.occurredAt}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[#737373]">
                        {att.httpStatus || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[#737373] tabular-nums">
                        {att.latencyMs} ms
                      </td>
                      <td className="px-4 py-2.5">
                        {att.outcome === "success" ? (
                          <span className="font-medium text-green-600">
                            Success
                          </span>
                        ) : (
                          <span className="font-medium text-red-600">
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Redrive Dialog */}
      <RedriveDialog
        deliveryId={deliveryId}
        eventType={delivery.eventType}
        isOpen={isRedriveOpen}
        onClose={() => setIsRedriveOpen(false)}
        onConfirm={handleRedriveConfirm}
      />
    </div>
  );
}
