"use client";

import { useState } from "react";
import { Copy, Check, Info } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { createInvite } from "../lib/client";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  WORKSPACE_ROLES,
} from "../lib/permissions";
import type { WorkspaceRole } from "../lib/types";

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function InviteMemberModal({
  open,
  onClose,
  workspaceId,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("analyst");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-time invite token reveal state
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function resetState() {
    setEmail("");
    setRole("analyst");
    setError(null);
    setCreatedToken(null);
    setCopied(false);
  }

  function handleClose() {
    if (isSubmitting) return;
    resetState();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await createInvite(workspaceId, {
      email: trimmedEmail,
      role,
    });
    setIsSubmitting(false);

    if (res.rawToken) {
      setCreatedToken(res.rawToken);
    } else if (res.error) {
      setError(res.error.message || "Failed to create invite.");
    } else {
      onClose();
    }
  }

  async function handleCopyToken() {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy token to clipboard. Please copy it manually.");
    }
  }

  return (
    <SettingsDialog
      open={open}
      onClose={handleClose}
      title={createdToken ? "Invite created" : "Invite member"}
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[480px]"
    >
      {createdToken ? (
        <div className="space-y-4">
          <div className="p-3 bg-neutral-50 border border-border-faint rounded-10 space-y-1">
            <p className="text-xs font-semibold text-accent-black">
              Invite token generated for {email}
            </p>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Automatic email delivery is not yet configured. Share this one-time token directly with your teammate.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-accent-black">
              Invite token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdToken}
                className="flex-1 font-mono text-xs bg-neutral-50 border border-border-faint rounded-10 px-3 py-2 text-neutral-700 select-all"
              />
              <button
                type="button"
                onClick={() => void handleCopyToken()}
                className="px-3 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors inline-flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border-faint">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-10 bg-accent-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="invite-email" className="block text-xs font-semibold text-accent-black">
              Email address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="teammate@example.com"
              className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="invite-role" className="block text-xs font-semibold text-accent-black">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              className="w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs font-medium text-accent-black focus:outline-none focus:ring-2 focus:ring-heat-24 transition-shadow"
            >
              {WORKSPACE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>

            <div className="p-2.5 bg-neutral-50 rounded-8 border border-border-faint flex items-start gap-2 mt-2">
              <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>
          </div>

          {error ? (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-faint">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create invite"}
            </button>
          </div>
        </form>
      )}
    </SettingsDialog>
  );
}
