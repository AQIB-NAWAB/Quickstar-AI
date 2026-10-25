"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, KeyRound, Loader2 } from "lucide-react";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import { smtpEmailCampaignsApi } from "../lib/client";
import type { SmtpMailbox } from "../lib/types";

export function SmtpConnectionDialog({
  workspaceId,
  open,
  onClose,
  onConnected,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onConnected: (mailbox: SmtpMailbox) => void;
}) {
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dailyLimit, setDailyLimit] = useState("50");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setAppPassword("");
    setFirstName("");
    setLastName("");
    setDailyLimit("50");
    setError(null);
    setSuccess(null);
  }

  async function submit() {
    setError(null);
    setSuccess(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter the Google email address for the sending mailbox.");
      return;
    }
    if (!/^[A-Za-z0-9]{16}$/.test(appPassword.replace(/[\s-]+/g, ""))) {
      setError("Google app passwords are 16 characters. Copy the password from Google without spaces.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError("Add the first and last name for the sending account.");
      return;
    }
    setSubmitting(true);
    const result = await smtpEmailCampaignsApi.connectMailbox(workspaceId, {
      email: trimmed,
      appPassword: appPassword.replace(/[\s-]+/g, ""),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dailyLimit: Math.min(1000, Math.max(1, Number(dailyLimit) || 50)),
    });
    setSubmitting(false);
    if (result.status !== "ready") {
      setError("message" in result ? result.message : "Failed to connect the mailbox.");
      return;
    }
    setAppPassword("");
    setSuccess(`Connected ${result.data.email}. Emails will send from this mailbox.`);
    onConnected(result.data);
  }

  return (
    <FeatureDialog
      open={open}
      onClose={() => {
        if (!submitting) {
          reset();
          onClose();
        }
      }}
      title="Connect a sending mailbox"
      description="Send from Gmail or Google Workspace using a Google app password. The password is encrypted and never shown again."
      maxWidthClass="max-w-md"
      isSubmitting={submitting}
    >
      <div className="overflow-y-auto p-6 space-y-4">
        <div className="rounded-12 border border-border-faint bg-neutral-50/70 p-4 space-y-2 text-[11px] leading-relaxed text-neutral-600">
          <p className="font-semibold text-accent-black">Get a Google app password</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Turn on 2-Step Verification for the Google account.</li>
            <li>Open Google App Passwords and create one for “Mail”.</li>
            <li>Copy the 16-character password into the field below.</li>
          </ol>
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-heat-100 hover:text-heat-200"
          >
            Open Google app passwords
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-8 border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="flex items-center gap-2 rounded-8 border border-green-200 bg-[#E9F9EF] p-3 text-xs text-[#027A48]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        <div className="space-y-3">
          <label className="block space-y-1 text-xs font-semibold text-accent-black">
            Google email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@gmail.com"
              className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
            />
          </label>
          <label className="block space-y-1 text-xs font-semibold text-accent-black">
            Google app password
            <input
              type="password"
              value={appPassword}
              onChange={(event) => setAppPassword(event.target.value)}
              placeholder="16-character app password"
              autoComplete="new-password"
              className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
            />
            <span className="block text-[11px] font-normal text-neutral-500">
              Stored encrypted in the secrets service; only used for SMTP sending.
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold text-accent-black">
              First name
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jane"
                className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
              />
            </label>
            <label className="block space-y-1 text-xs font-semibold text-accent-black">
              Last name
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Doe"
                className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs font-semibold text-accent-black">
            Daily sending limit
            <input
              type="number"
              min={1}
              max={1000}
              value={dailyLimit}
              onChange={(event) => setDailyLimit(event.target.value)}
              className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
            />
            <span className="block text-[11px] font-normal text-neutral-500">
              The sender pauses for the day after this many sends to stay inside
              Gmail’s sending limits.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-faint pt-3">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={submitting}
            className="rounded-8 border border-border-faint bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-4 py-2 text-xs font-semibold text-white hover:bg-heat-200 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            {submitting ? "Verifying SMTP…" : "Connect mailbox"}
          </button>
        </div>
      </div>
    </FeatureDialog>
  );
}
