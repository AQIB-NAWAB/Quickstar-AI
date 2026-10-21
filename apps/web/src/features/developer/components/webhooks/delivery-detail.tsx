"use client";

import { AlertCircle, Check, Copy, History, Loader2, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getWebhooksRepository } from "../../lib/repository";
import type { WebhookDelivery, WebhookEndpoint } from "../../lib/types";
import { RedriveDialog } from "./redrive-dialog";

interface DeliveryDetailProps {
  workspaceId: string;
  endpoint?: WebhookEndpoint;
  webhookId?: string;
  deliveryId?: string;
  isPreview?: boolean;
  onClose?: () => void;
}

export function DeliveryDetail({
  workspaceId,
  endpoint,
  webhookId,
  deliveryId: initialDeliveryId,
  isPreview = false,
  onClose,
}: DeliveryDetailProps) {
  const endpointId = endpoint?.id || webhookId || "";
  const endpointUrl = endpoint?.url || endpointId;
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"request" | "response" | "attempts">("request");
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isRedriveOpen, setIsRedriveOpen] = useState(false);
  const [isRedriving, setIsRedriving] = useState(false);

  const repo = getWebhooksRepository(isPreview);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    repo
      .listDeliveries(workspaceId, endpointId)
      .then((res) => {
        if (!cancelled) {
          if (res.status === "ready") {
            setDeliveries(res.data);
            if (res.data.length > 0) {
              const target = initialDeliveryId
                ? res.data.find((d) => d.id === initialDeliveryId) || res.data[0]
                : res.data[0];
              setSelectedDelivery(target);
            }
          } else {
            setError(res.message);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load deliveries");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo, workspaceId, endpointId, initialDeliveryId]);

  const handleRedriveConfirm = async () => {
    if (!selectedDelivery) return;
    setIsRedriving(true);
    try {
      const res = await repo.redriveDelivery(workspaceId, endpointId, selectedDelivery.id);
      if (res.status === "ready") {
        setSelectedDelivery(res.data);
        setDeliveries((prev) =>
          prev.map((d) => (d.id === res.data.id ? res.data : d)),
        );
        setActiveTab("attempts");
      }
    } finally {
      setIsRedriving(false);
    }
  };

  const handleCopyPayload = () => {
    if (!selectedDelivery) return;
    navigator.clipboard.writeText(JSON.stringify(selectedDelivery.request.body, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="bg-white border border-[#EAECF0] rounded-12 p-4 space-y-4 shadow-xs text-xs text-[#18181B] max-h-[calc(100vh-140px)] overflow-y-auto">
      {/* Header matching Image 6 */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EAECF0]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-[#18181B]">Delivery Trace &amp; Audit</h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#F8F9FB] border border-[#EAECF0] text-[#71717A] truncate max-w-[200px]">
              {endpointUrl}
            </span>
          </div>
          <p className="text-[11px] text-[#71717A] mt-0.5">
            Real-time payload inspection, HMAC signatures, and redrive history.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close delivery trace"
            className="text-[#71717A] hover:text-[#18181B] p-1 rounded-4 hover:bg-[#F8F9FB] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-[#71717A] space-y-2">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#FF571A]" />
          <p className="text-xs">Loading delivery traces...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-8 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load deliveries</span>
          </div>
          <p>{error}</p>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="p-8 text-center text-[#71717A] bg-[#F8F9FB] rounded-8 border border-[#EAECF0] space-y-1">
          <Send className="w-6 h-6 text-[#A1A1AA] mx-auto mb-1" />
          <p className="font-semibold text-xs text-[#18181B]">No deliveries recorded yet</p>
          <p className="text-[11px]">When subscribed platform events occur, payload logs and attempts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Deliveries Picker / Strip */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider block">
              Recent Deliveries
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {deliveries.map((del) => {
                const isSelected = selectedDelivery?.id === del.id;
                const isSuccess = del.outcome === "success";

                return (
                  <button
                    key={del.id}
                    type="button"
                    onClick={() => setSelectedDelivery(del)}
                    className={`px-2.5 py-1.5 rounded-8 text-left border whitespace-nowrap text-xs transition-colors shrink-0 ${
                      isSelected
                        ? "bg-[#FFF4ED] border-[#FF571A] text-[#18181B] font-semibold"
                        : "bg-[#F8F9FB] border-[#EAECF0] text-[#52525B] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSuccess ? "bg-[#027A48]" : "bg-[#B42318]"
                        }`}
                      />
                      <span>{del.eventType}</span>
                    </div>
                    <div className="text-[10px] text-[#71717A] mt-0.5 font-mono">
                      {del.httpStatus ? `HTTP ${del.httpStatus}` : "Failed"} &middot; {del.latencyMs}ms
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDelivery && (
            <div className="space-y-4 pt-2 border-t border-[#EAECF0]">
              {/* Selected Delivery Overview Banner matching Image 6 */}
              <div className="p-3.5 rounded-10 bg-[#F8F9FB] border border-[#EAECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#18181B]">
                      {selectedDelivery.eventType}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                        selectedDelivery.outcome === "success"
                          ? "bg-[#E9F9EF] text-[#027A48] border-[#A6F4C5]"
                          : "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]"
                      }`}
                    >
                      {selectedDelivery.httpStatus
                        ? `HTTP ${selectedDelivery.httpStatus}`
                        : "FAILED"}
                    </span>
                    <span className="text-[10px] font-mono text-[#71717A]">
                      Attempt {selectedDelivery.attempt} &middot; {selectedDelivery.latencyMs}ms
                    </span>
                  </div>

                  <p className="text-[10px] text-[#71717A] font-mono">
                    ID: {selectedDelivery.id} &middot; {new Date(selectedDelivery.timestamp).toUTCString()}
                  </p>

                  {selectedDelivery.error && (
                    <div className="text-[11px] text-[#B42318] font-medium pt-0.5">
                      Error: {selectedDelivery.error}
                    </div>
                  )}
                </div>

                {/* Redrive Button matching Image 6 */}
                <button
                  type="button"
                  onClick={() => setIsRedriveOpen(true)}
                  disabled={isRedriving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF571A] hover:bg-[#E0460D] text-white rounded-8 font-semibold text-xs shadow-xs transition-colors self-start sm:self-center shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRedriving ? "animate-spin" : ""}`} />
                  <span>Redrive delivery</span>
                </button>
              </div>

              {/* Tabs: Request | Response | Attempts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#EAECF0]">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab("request")}
                      className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === "request"
                          ? "border-[#FF571A] text-[#FF571A]"
                          : "border-transparent text-[#71717A] hover:text-[#18181B]"
                      }`}
                    >
                      Request Payload
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("response")}
                      className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === "response"
                          ? "border-[#FF571A] text-[#FF571A]"
                          : "border-transparent text-[#71717A] hover:text-[#18181B]"
                      }`}
                    >
                      Response Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("attempts")}
                      className={`pb-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                        activeTab === "attempts"
                          ? "border-[#FF571A] text-[#FF571A]"
                          : "border-transparent text-[#71717A] hover:text-[#18181B]"
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Attempts ({selectedDelivery.attemptsHistory?.length || selectedDelivery.attempt})</span>
                    </button>
                  </div>

                  {activeTab === "request" && (
                    <button
                      type="button"
                      onClick={handleCopyPayload}
                      className="inline-flex items-center gap-1 text-[11px] text-[#71717A] hover:text-[#18181B] pb-1"
                    >
                      {copiedPayload ? (
                        <>
                          <Check className="w-3 h-3 text-[#027A48]" />
                          <span className="text-[#027A48] font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Payload</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {activeTab === "request" ? (
                  <div className="space-y-3">
                    {/* Headers Box */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">
                        HTTP Headers
                      </span>
                      <div className="p-2.5 rounded-8 bg-[#F8F9FB] border border-[#EAECF0] font-mono text-[11px] text-[#18181B] space-y-1 overflow-x-auto">
                        {Object.entries(selectedDelivery.request.headers).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-[#71717A]">{k}:</span> {v}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Body Box */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block">
                        JSON Payload
                      </span>
                      <pre className="p-3 rounded-8 bg-[#F8F9FB] border border-[#EAECF0] font-mono text-[11px] text-[#18181B] overflow-x-auto max-h-56 leading-relaxed">
                        {JSON.stringify(selectedDelivery.request.body, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : activeTab === "response" ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-8 bg-[#F8F9FB] border border-[#EAECF0] space-y-2 font-mono text-[11px]">
                      <div>
                        <span className="text-[#71717A]">HTTP Status: </span>
                        <span className="font-bold text-[#18181B]">
                          {selectedDelivery.httpStatus || "No response received"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#71717A]">Round-trip Latency: </span>
                        <span className="text-[#18181B]">{selectedDelivery.latencyMs}ms</span>
                      </div>
                      {selectedDelivery.response?.body && (
                        <div className="pt-2 border-t border-[#EAECF0]">
                          <span className="text-[#71717A] block mb-1">Response Body:</span>
                          <pre className="text-[#52525B] whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {typeof selectedDelivery.response.body === "object"
                              ? JSON.stringify(selectedDelivery.response.body, null, 2)
                              : selectedDelivery.response.body}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Attempts Timeline matching Image 6 */}
                    <div className="divide-y divide-[#EAECF0] border border-[#EAECF0] rounded-8 overflow-hidden">
                      {(selectedDelivery.attemptsHistory && selectedDelivery.attemptsHistory.length > 0
                        ? selectedDelivery.attemptsHistory
                        : [
                            {
                              attemptNumber: selectedDelivery.attempt,
                              occurredAt: selectedDelivery.timestamp,
                              httpStatus: selectedDelivery.httpStatus,
                              latencyMs: selectedDelivery.latencyMs,
                              outcome: selectedDelivery.outcome,
                              error: selectedDelivery.error,
                            },
                          ]
                      ).map((att) => (
                        <div
                          key={att.attemptNumber}
                          className="p-3 flex items-center justify-between text-xs bg-[#F8F9FB]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#18181B]">
                              Attempt #{att.attemptNumber}
                            </span>
                            <span
                              className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                att.outcome === "success"
                                  ? "bg-[#E9F9EF] text-[#027A48] border-[#A6F4C5]"
                                  : "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]"
                              }`}
                            >
                              {att.httpStatus ? `HTTP ${att.httpStatus}` : "FAILED"}
                            </span>
                          </div>

                          <div className="font-mono text-[10px] text-[#71717A] flex items-center gap-2">
                            <span>{att.latencyMs}ms</span>
                            <span>&middot;</span>
                            <span>{new Date(att.occurredAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Redrive Confirmation Dialog */}
      {selectedDelivery && (
        <RedriveDialog
          deliveryId={selectedDelivery.id}
          eventType={selectedDelivery.eventType}
          isOpen={isRedriveOpen}
          onClose={() => setIsRedriveOpen(false)}
          onConfirm={handleRedriveConfirm}
        />
      )}
    </div>
  );
}
