"use client";

import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { getWebhooksRepository } from "../../lib/repository";
import type { WebhookEndpoint } from "../../lib/types";

const PLATFORM_EVENTS = [
  { id: "conversation.ended", label: "conversation.ended" },
  { id: "conversation.handed_off", label: "conversation.handed_off" },
  { id: "agent.published", label: "agent.published" },
  { id: "knowledge.ingestion_failed", label: "knowledge.ingestion_failed" },
  { id: "campaign.attention_required", label: "campaign.attention_required" },
  { id: "member.role_updated", label: "member.role_updated" },
];

interface WebhookRegistrationProps {
  workspaceId: string;
  isPreview?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { endpoint: WebhookEndpoint; secret: string }) => void;
}

export function WebhookRegistration({
  workspaceId,
  isPreview = false,
  isOpen,
  onClose,
  onSuccess,
}: WebhookRegistrationProps) {
  const [url, setUrl] = useState("https://api.acme.ai/webhooks/incoming");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "conversation.ended",
    "campaign.attention_required",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleEvent = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter((id) => id !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
      setError("Endpoint URL must be a valid absolute HTTPS address.");
      return;
    }
    if (selectedEvents.length === 0) {
      setError("Please select at least one platform event subscription.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const repo = getWebhooksRepository(isPreview);
    const result = await repo.registerEndpoint(workspaceId, {
      url,
      events: selectedEvents,
    });

    setIsSubmitting(false);
    if (result.status === "ready") {
      onSuccess({
        endpoint: result.data.endpoint,
        secret: result.data.signingSecret,
      });
    } else {
      setError(result.message || "Failed to register webhook endpoint");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Register webhook"
        className="w-full max-w-lg rounded-12 border border-[#EAECF0] bg-white p-6 shadow-xl space-y-5 text-xs text-[#18181B]"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#EAECF0]">
          <div>
            <h2 className="text-sm font-bold text-[#18181B]">
              Register Webhook Endpoint
            </h2>
            <p className="text-[11px] text-[#71717A] mt-0.5">
              Subscribe to secure, signed real-time events delivered via HTTP POST.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#71717A] hover:text-[#18181B] transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-8 border border-[#FECDCA] bg-[#FEF3F2] p-2.5 text-xs text-[#B42318]">
              {error}
            </div>
          )}

          {/* Endpoint URL */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#71717A]">
              Endpoint URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.yourdomain.com/webhooks"
              className="w-full rounded-8 border border-[#EAECF0] bg-[#F8F9FB] px-3 py-2 font-mono text-xs text-[#18181B] focus:border-[#FF571A] focus:bg-white focus:outline-none"
            />
            <p className="text-[10px] text-[#71717A]">
              Must be reachable over HTTPS and accept JSON payloads with signature verification.
            </p>
          </div>

          {/* Subscribed events */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#71717A]">
              Subscribed Event Types
            </label>
            <div className="space-y-2 rounded-8 border border-[#EAECF0] bg-[#F8F9FB] p-3 max-h-48 overflow-y-auto">
              {PLATFORM_EVENTS.map((event) => {
                const isChecked = selectedEvents.includes(event.id);
                return (
                  <label
                    key={event.id}
                    className="flex items-center gap-2.5 text-xs text-[#18181B] cursor-pointer hover:text-[#FF571A]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleEvent(event.id)}
                      className="h-3.5 w-3.5 rounded border-[#EAECF0] text-[#FF571A] focus:ring-[#FF571A]"
                    />
                    <span className="font-mono text-[11px]">{event.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAECF0]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-8 border border-[#EAECF0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#71717A] hover:bg-[#F8F9FB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-8 bg-[#FF571A] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#E0460D] transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>{isSubmitting ? "Registering..." : "Create Webhook"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
