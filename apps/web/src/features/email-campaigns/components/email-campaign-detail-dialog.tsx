"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Ban,
  CheckCircle2,
  History,
  Loader2,
  Mail,
  Pause,
  Play,
  Send,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";
import { EmailCampaignStatusBadge, EmailRecipientStatusBadge } from "./email-status-badge";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import { smtpEmailCampaignsApi } from "../lib/client";
import type { SmtpCampaignDetail } from "../lib/types";

type DetailStep = "overview" | "recipients" | "emails" | "activity";

const ACTIVITY_STYLES: Record<
  string,
  { label: string; icon: typeof Mail; className: string; pulse?: boolean }
> = {
  created: { label: "Created", icon: Mail, className: "bg-blue-50 border-blue-200/80 text-blue-700" },
  recipients_updated: { label: "Recipients updated", icon: Users, className: "bg-blue-50 border-blue-200/80 text-blue-700" },
  activated: { label: "Activated", icon: Send, className: "bg-orange-50 border-orange-100 text-heat-100" },
  sent: { label: "Sent", icon: CheckCircle2, className: "bg-emerald-50 border-emerald-200/80 text-emerald-700" },
  send_retrying: { label: "Retrying", icon: Loader2, className: "bg-amber-50 border-amber-200/70 text-amber-700", pulse: true },
  send_failed: { label: "Send failed", icon: AlertCircle, className: "bg-red-50 border-red-200/80 text-red-600" },
  paused: { label: "Paused", icon: Pause, className: "bg-amber-50 border-amber-200/70 text-amber-700" },
  resumed: { label: "Resumed", icon: Play, className: "bg-emerald-50 border-emerald-200/80 text-emerald-700" },
  cancelled: { label: "Cancelled", icon: Ban, className: "bg-red-50 border-red-200/80 text-red-600" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-emerald-50 border-emerald-200/80 text-emerald-700" },
  unsubscribed: { label: "Unsubscribed", icon: ShieldOff, className: "bg-red-50 border-red-200/80 text-red-600" },
  suppressed: { label: "Suppressed", icon: ShieldOff, className: "bg-amber-50 border-amber-200/70 text-amber-700" },
};

function activityStyle(type: string): { label: string; icon: typeof Mail; className: string; pulse?: boolean } {
  return (
    ACTIVITY_STYLES[type] ?? {
      label: type,
      icon: History,
      className: "bg-neutral-100 border-neutral-200 text-neutral-500",
    }
  );
}

const STEPS: Array<{ id: DetailStep; label: string; icon: typeof BarChart3 }> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "recipients", label: "Recipients", icon: Users },
  { id: "emails", label: "Sent emails", icon: Mail },
  { id: "activity", label: "Activity", icon: History },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-12 border border-border-faint bg-neutral-50/70 p-4">
      <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500">
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5 text-neutral-400" />
      </div>
      <div className="mt-2 font-mono text-xl font-bold tracking-tight text-accent-black">
        {value}
      </div>
    </div>
  );
}

export function EmailCampaignDetailDialog({
  workspaceId,
  campaignId,
  open,
  onClose,
  onChanged,
}: {
  workspaceId: string;
  campaignId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<SmtpCampaignDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<DetailStep>("overview");
  const [previewRecipientId, setPreviewRecipientId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !campaignId) return;
    let cancelled = false;
    setStep("overview");
    setPreviewRecipientId(null);
    setActionError(null);
    setLoading(true);
    setError(null);
    setDetail(null);
    void smtpEmailCampaignsApi
      .getCampaign(workspaceId, campaignId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === "ready") {
          setDetail(result.data);
          const firstSent = result.data.recipients.find((recipient) => recipient.sentSubject);
          setPreviewRecipientId((current) => current ?? firstSent?.id ?? null);
        } else {
          setError("message" in result ? result.message : "Failed to load campaign.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId, workspaceId]);

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const previewRecipient = detail?.recipients.find(
    (recipient) => recipient.id === previewRecipientId,
  );

  async function runAction(
    action: "pause" | "resume" | "cancel" | "delete",
    confirmMessage: string,
  ) {
    if (!detail || !window.confirm(confirmMessage)) return;
    setActionLoading(true);
    setActionError(null);
    const result =
      action === "pause"
        ? await smtpEmailCampaignsApi.pauseCampaign(workspaceId, detail.id)
        : action === "resume"
          ? await smtpEmailCampaignsApi.resumeCampaign(workspaceId, detail.id)
          : action === "cancel"
            ? await smtpEmailCampaignsApi.cancelCampaign(workspaceId, detail.id)
            : await smtpEmailCampaignsApi.deleteCampaign(workspaceId, detail.id);
    if (result.status === "ready") {
      setActionLoading(false);
      if (action === "delete") {
        onChanged();
        onClose();
        return;
      }
      const refreshed = await smtpEmailCampaignsApi.getCampaign(workspaceId, detail.id);
      if (refreshed.status === "ready") setDetail(refreshed.data);
      onChanged();
      return;
    }
    setActionError("message" in result ? result.message : `Failed to ${action} the campaign.`);
    setActionLoading(false);
  }

  const actionable = detail
    ? ["draft", "scheduled", "sending", "paused"].includes(detail.status)
    : false;

  return (
    <FeatureDialog
      open={open}
      onClose={onClose}
      title={detail?.name ?? "Email campaign"}
      description={detail ? `${detail.status} · ${detail.counts.total} recipients` : "Status, recipients, sent emails, and activity."}
      maxWidthClass="max-w-4xl"
      bodyClassName="flex min-h-0 flex-col p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border-faint px-6 pt-4">
          <div role="tablist" aria-label="Campaign detail sections" className="flex gap-1">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const active = step === item.id;
              const complete = index < stepIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStep(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-3 -mb-px border-b-2 text-xs font-semibold transition-colors ${
                    active
                      ? "border-heat-100 text-heat-100"
                      : complete
                        ? "border-transparent text-neutral-600 hover:text-accent-black"
                        : "border-transparent text-neutral-500 hover:text-accent-black"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      active
                        ? "border-heat-100 bg-orange-50 text-heat-100"
                        : complete
                          ? "border-neutral-200 bg-neutral-100 text-neutral-500"
                          : "border-neutral-200 bg-white text-neutral-500"
                    }`}
                  >
                    {complete ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                  </span>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center gap-2 py-16 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin text-heat-100" />
              Loading campaign details…
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 rounded-12 border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && detail && step === "overview" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <EmailCampaignStatusBadge status={detail.status} />
                    {detail.mode === "personalized" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-heat-100">
                        AI personalized
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-bold leading-snug text-accent-black">
                    {detail.name}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    {detail.mailbox
                      ? `Sending from ${detail.mailbox.email}`
                      : "No sending mailbox"}
                    {detail.activatedAt ? ` · activated ${formatDate(detail.activatedAt)}` : ""}
                  </p>
                  {detail.lastError && (
                    <p className="mt-1 text-xs text-red-600">{detail.lastError}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.status === "sending" && (
                    <button
                      type="button"
                      onClick={() => void runAction("pause", "Pause this campaign? No further emails will send until you resume it.")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </button>
                  )}
                  {detail.status === "paused" && (
                    <button
                      type="button"
                      onClick={() => void runAction("resume", "Resume this campaign?")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </button>
                  )}
                  {actionable && detail.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() =>
                        void runAction(
                          "cancel",
                          "Cancel this campaign? Unsent emails will be skipped and cannot be restored.",
                        )
                      }
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-8 border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  )}
                  {["draft", "cancelled", "completed"].includes(detail.status) && (
                    <button
                      type="button"
                      onClick={() => void runAction("delete", "Delete this campaign permanently?")}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-8 border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {actionError && (
                <div role="alert" className="flex items-start gap-2 rounded-8 border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric label="Recipients" value={String(detail.counts.total)} icon={Users} />
                <Metric label="Sent" value={String(detail.counts.sent)} icon={Send} />
                <Metric
                  label="Pending"
                  value={String(detail.counts.pending + detail.counts.retrying)}
                  icon={Mail}
                />
                <Metric
                  label="Suppressed / failed"
                  value={String(detail.counts.suppressed + detail.counts.failed)}
                  icon={AlertCircle}
                />
              </div>

              <dl className="rounded-12 border border-border-faint bg-white p-4 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-4 border-b border-border-faint py-2.5 last:border-b-0">
                  <dt className="shrink-0 text-neutral-500">Mode</dt>
                  <dd className="text-right font-medium text-accent-black">
                    {detail.mode === "personalized" ? "AI personalized" : "Shared email"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border-faint py-2.5 last:border-b-0">
                  <dt className="shrink-0 text-neutral-500">Sender name</dt>
                  <dd className="text-right font-medium text-accent-black">{detail.fromName || "—"}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border-faint py-2.5 last:border-b-0">
                  <dt className="shrink-0 text-neutral-500">Scheduled start</dt>
                  <dd className="text-right font-medium text-accent-black">
                    {formatDate(detail.scheduledStartAt)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border-faint py-2.5 last:border-b-0">
                  <dt className="shrink-0 text-neutral-500">Follow-ups</dt>
                  <dd className="text-right font-medium text-accent-black">
                    {detail.schedule.followUps?.length ?? 0}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border-faint py-2.5 last:border-b-0">
                  <dt className="shrink-0 text-neutral-500">Recipients fixed</dt>
                  <dd className="text-right font-medium text-accent-black">
                    {detail.recipientsFixed ? "Yes" : "No (draft)"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border-faint py-2.5 last:border-b-0">
                  <dt className="shrink-0 text-neutral-500">Created</dt>
                  <dd className="text-right font-medium text-accent-black">
                    {formatDate(detail.createdAt)}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {!loading && detail && step === "recipients" && (
            <div className="rounded-12 border border-border-faint bg-white">
              <div className="flex items-center justify-between border-b border-border-faint px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Recipients
                </p>
                <span className="font-mono text-[11px] text-neutral-500">
                  {detail.recipients.length}
                </span>
              </div>
              {detail.recipients.length === 0 ? (
                <p className="p-4 text-xs text-neutral-500">No recipients yet.</p>
              ) : (
                <ul className="divide-y divide-border-faint">
                  {detail.recipients.map((recipient) => (
                    <li key={recipient.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-accent-black">
                          {recipient.name || recipient.company || recipient.email}
                        </p>
                        <p className="truncate font-mono text-[11px] text-neutral-500">
                          {recipient.email}
                        </p>
                        {recipient.lastError && (
                          <p className="truncate text-[11px] text-red-600">{recipient.lastError}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {recipient.followupStep > 0 && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                            FU {recipient.followupStep}
                          </span>
                        )}
                        <EmailRecipientStatusBadge status={recipient.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!loading && detail && step === "emails" && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0 space-y-4">
                {previewRecipient && previewRecipient.sentSubject && previewRecipient.sentHtml ? (
                  <div className="rounded-12 border border-border-faint bg-neutral-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Sent subject
                    </p>
                    <p className="mt-1 text-sm font-bold text-accent-black">
                      {previewRecipient.sentSubject}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      To: {previewRecipient.email}
                      {previewRecipient.sentAt ? ` · sent ${formatDate(previewRecipient.sentAt)}` : ""}
                      {previewRecipient.messageId ? ` · ${previewRecipient.messageId}` : ""}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-12 border border-dashed border-border-faint p-12 text-center text-xs text-neutral-500">
                    Select a recipient on the right to see the exact email they received.
                  </div>
                )}
                {previewRecipient?.sentHtml ? (
                  <iframe
                    title="Sent email preview"
                    srcDoc={previewRecipient.sentHtml}
                    sandbox=""
                    className="h-[420px] w-full rounded-12 border border-border-faint bg-white"
                  />
                ) : null}
              </div>
              <div className="rounded-12 border border-border-faint bg-white">
                <div className="border-b border-border-faint px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Sent emails
                  </p>
                </div>
                <ul className="max-h-[560px] divide-y divide-border-faint overflow-y-auto">
                  {detail.recipients
                    .filter((recipient) => recipient.sentSubject)
                    .map((recipient) => (
                      <li key={recipient.id}>
                        <button
                          type="button"
                          onClick={() => setPreviewRecipientId(recipient.id)}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors ${
                            previewRecipientId === recipient.id
                              ? "bg-orange-50/60"
                              : "hover:bg-neutral-50"
                          }`}
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-accent-black">
                              {recipient.email}
                            </span>
                            <span className="block truncate text-[11px] text-neutral-500">
                              {recipient.followupStep > 0
                                ? `Follow-up ${recipient.followupStep}`
                                : "Initial email"}
                              {recipient.sentAt ? ` · ${new Date(recipient.sentAt).toLocaleDateString()}` : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  {detail.recipients.filter((recipient) => recipient.sentSubject).length === 0 && (
                    <li className="px-4 py-6 text-center text-[11px] text-neutral-500">
                      Nothing sent yet.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {!loading && detail && step === "activity" && (
            <div className="rounded-12 border border-border-faint bg-white">
              <div className="flex items-center justify-between border-b border-border-faint px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Activity history
                </p>
                <span className="font-mono text-[11px] text-neutral-500">
                  {detail.activity.length}
                </span>
              </div>
              {detail.activity.length === 0 ? (
                <p className="p-4 text-xs text-neutral-500">No activity yet.</p>
              ) : (
                <ol className="px-5 py-4">
                  {detail.activity.map((entry, index) => {
                    const event = activityStyle(entry.type);
                    const Icon = event.icon;
                    const last = index === detail.activity.length - 1;
                    return (
                      <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {!last && (
                          <span className="absolute left-[11px] top-7 bottom-0 w-px bg-border-faint" />
                        )}
                        <span
                          className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${event.className}`}
                        >
                          <Icon className={`h-3 w-3 ${event.pulse ? "animate-spin" : ""}`} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-accent-black leading-relaxed">
                            {entry.message ?? entry.type}
                          </p>
                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            {event.label} · {formatDate(entry.createdAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border-faint px-6 py-3">
          <button
            type="button"
            onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].id)}
            disabled={stepIndex <= 0}
            className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Close
            </button>
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(STEPS[stepIndex + 1].id)}
                className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-3 py-1.5 text-xs font-semibold text-white hover:bg-heat-200"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-3 py-1.5 text-xs font-semibold text-white hover:bg-heat-200"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </FeatureDialog>
  );
}
