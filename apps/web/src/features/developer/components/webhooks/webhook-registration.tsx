"use client";

import { X } from "lucide-react";
import { useState } from "react";

const PLATFORM_EVENTS = [
  { id: "conversation.handed_off", label: "conversation.handed_off" },
  { id: "agent.published", label: "agent.published" },
  { id: "message.appended", label: "message.appended" },
  { id: "conversation.released", label: "conversation.released" },
];

interface WebhookRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { url: string; events: string[]; secret: string }) => void;
}

export function WebhookRegistration({
  isOpen,
  onClose,
  onSuccess,
}: WebhookRegistrationProps) {
  const [url, setUrl] = useState("https://hooks.example.com/quickstart");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "conversation.handed_off",
    "agent.published",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith("https://")) {
      setError("Endpoint URL must be a valid absolute HTTPS address.");
      return;
    }
    if (selectedEvents.length === 0) {
      setError("Please select at least one platform event subscription.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // In preview/frontend simulation, return the secret
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess({
        url,
        events: selectedEvents,
        secret: "example_secret_not_valid",
      });
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-label="Register webhook" className="w-full max-w-lg rounded-xl border border-[#ededed] bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#262626]">
            Register webhook
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#a3a3a3] hover:text-[#262626] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Endpoint URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#737373]">
              Endpoint URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.example.com/endpoint"
              className="w-full rounded-lg border border-[#ededed] bg-[#f9f9f9] px-3 py-2 font-mono text-xs text-[#262626] focus:border-[#fa5d19] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Subscribed events */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#737373]">
              Subscribed events
            </label>
            <div className="space-y-2 rounded-lg border border-[#ededed] bg-[#f9f9f9] p-3">
              {PLATFORM_EVENTS.map((event) => {
                const isChecked = selectedEvents.includes(event.id);
                return (
                  <label
                    key={event.id}
                    className="flex items-center gap-2.5 text-xs text-[#262626] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleEvent(event.id)}
                      className="h-3.5 w-3.5 rounded border-[#d4d4d4] text-[#fa5d19] focus:ring-[#fa5d19]"
                    />
                    <span className="font-mono text-[11px]">{event.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#ededed] bg-white px-4 py-2 text-xs font-medium text-[#737373] hover:text-[#262626] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#fa5d19] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#e04f14] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Registering..." : "Register endpoint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
