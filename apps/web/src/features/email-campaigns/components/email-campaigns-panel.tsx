"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Eye,
  History,
  Loader2,
  Mail,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react";
import { EmailCampaignStatusBadge } from "./email-status-badge";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import { smtpEmailCampaignsApi } from "../lib/client";
import type { SmtpCampaign, SmtpMailbox, SmtpSuppression } from "../lib/types";
import { SmtpConnectionDialog } from "./smtp-connection-dialog";
import { CampaignBuilderDialog } from "./campaign-builder-dialog";
import { EmailCampaignDetailDialog } from "./email-campaign-detail-dialog";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function formatCreatedDateTime(iso?: string | null) {
  if (!iso) return { date: "—", time: "" };
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { date: iso, time: "" };

    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return { date, time };
  } catch {
    return { date: iso, time: "" };
  }
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Mail;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-border-faint rounded-12 p-4 shadow-xs">
      <div className="flex items-center justify-between text-neutral-500 text-xs">
        <span>{label}</span>
        <Icon className={`w-3.5 h-3.5 ${accent ? "text-heat-100" : "text-neutral-400"}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-accent-black">{value}</div>
      <div className="text-[11px] text-neutral-400 mt-1">{hint}</div>
    </div>
  );
}

export function EmailCampaignsPanel({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [mailboxes, setMailboxes] = useState<SmtpMailbox[]>([]);
  const [campaigns, setCampaigns] = useState<SmtpCampaign[]>([]);
  const [suppressions, setSuppressions] = useState<SmtpSuppression[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [connectionOpen, setConnectionOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);
  const [suppressionOpen, setSuppressionOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    campaign: SmtpCampaign;
    action: "pause" | "resume" | "cancel" | "delete";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [mailboxesResult, campaignsResult, suppressionsResult] = await Promise.all([
      smtpEmailCampaignsApi.listMailboxes(workspaceId),
      smtpEmailCampaignsApi.listCampaigns(workspaceId),
      smtpEmailCampaignsApi.listSuppressions(workspaceId),
    ]);
    if (mailboxesResult.status === "ready") setMailboxes(mailboxesResult.data);
    if (campaignsResult.status === "ready") setCampaigns(campaignsResult.data);
    else if ("message" in campaignsResult) setError(campaignsResult.message);
    if (suppressionsResult.status === "ready") setSuppressions(suppressionsResult.data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    await load();
    setRefreshing(false);
  }

  const sentTotal = campaigns.reduce((total, campaign) => total + campaign.counts.sent, 0);
  const pendingTotal = campaigns.reduce(
    (total, campaign) => total + campaign.counts.pending + campaign.counts.retrying,
    0,
  );
  const drafts = campaigns.filter((campaign) => campaign.status === "draft").length;

  const filteredCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      if (query && !campaign.name.toLowerCase().includes(query)) return false;
      if (statusFilter !== "all" && campaign.status !== statusFilter) return false;
      return true;
    });
  }, [campaigns, search, statusFilter]);

  async function confirmAction() {
    if (!confirmTarget) return;
    const { campaign, action } = confirmTarget;
    setActionLoading(true);
    setError(null);
    const result =
      action === "pause"
        ? await smtpEmailCampaignsApi.pauseCampaign(workspaceId, campaign.id)
        : action === "resume"
          ? await smtpEmailCampaignsApi.resumeCampaign(workspaceId, campaign.id)
          : action === "cancel"
            ? await smtpEmailCampaignsApi.cancelCampaign(workspaceId, campaign.id)
            : await smtpEmailCampaignsApi.deleteCampaign(workspaceId, campaign.id);
    setActionLoading(false);
    if (result.status === "ready") {
      setSuccess(
        action === "pause"
          ? "Campaign paused."
          : action === "resume"
            ? "Campaign resumed."
            : action === "cancel"
              ? "Campaign cancelled."
              : "Campaign deleted.",
      );
      setConfirmTarget(null);
      await load();
    } else {
      setError("message" in result ? result.message : `Failed to ${action} the campaign.`);
      setConfirmTarget(null);
    }
  }

  const activeMailboxCount = mailboxes.filter((mailbox) => mailbox.status === "active").length;

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 rounded-8 bg-neutral-100 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-12 border border-border-faint bg-white animate-pulse" />
          ))}
        </div>
        <div className="rounded-12 border border-border-faint bg-white p-8 shadow-xs space-y-3">
          <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
          <div className="h-12 bg-neutral-50 rounded-8 w-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-accent-black">
              Email Campaigns
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
              {activeMailboxCount} mailbox{activeMailboxCount === 1 ? "" : "es"}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 max-w-xl">
            Send AI-personalized or shared emails from your Google app passwords over
            SMTP — no third-party sending platform, no tracking pixels.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 self-stretch sm:self-auto lg:shrink-0">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2 rounded-8 bg-white border border-border-faint text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-xs disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setConnectionOpen(true)}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2 bg-white border border-border-faint text-xs font-semibold text-neutral-700 rounded-8 shadow-xs transition-colors hover:bg-neutral-50 whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5" />
            Connect mailbox
          </button>
          <button
            type="button"
            onClick={() => setBuilderOpen(true)}
            disabled={activeMailboxCount === 0}
            title={
              activeMailboxCount === 0 ? "Connect a sending mailbox first" : undefined
            }
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2 bg-heat-100 hover:bg-heat-200 text-white text-xs font-semibold rounded-8 shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            New email campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          label="Campaigns"
          value={String(campaigns.length)}
          hint="total email campaigns"
          icon={Mail}
        />
        <MetricCard
          label="Drafts"
          value={String(drafts)}
          hint="not yet activated"
          icon={History}
          accent={drafts > 0}
        />
        <MetricCard
          label="Sent"
          value={String(sentTotal)}
          hint="emails delivered via SMTP"
          icon={Send}
        />
        <MetricCard
          label="Pending"
          value={String(pendingTotal)}
          hint="queued or retrying"
          icon={Users}
        />
      </div>

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-12 border border-green-200 bg-[#E9F9EF] p-4 text-xs text-[#027A48]"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-12 border border-red-200 bg-red-50 p-4 text-xs text-red-700"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-border-faint rounded-12 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search campaigns..."
            aria-label="Search email campaigns"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-8 text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="email-campaign-status-filter" className="text-xs text-neutral-500 shrink-0 font-medium">
            Status:
          </label>
          <select
            id="email-campaign-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100"
          >
            <option value="all">All statuses</option>
            <option value="draft">Drafts</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white border border-border-faint rounded-16 p-8 sm:p-12 shadow-xs max-w-2xl mx-auto text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto text-heat-100 shadow-xs">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-accent-black">No email campaigns yet</h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 leading-relaxed">
              {activeMailboxCount === 0
                ? "Connect a Google mailbox with an app password first, then create your first campaign."
                : "Create a campaign from your accepted leads, review the AI sample, and send."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeMailboxCount === 0) setConnectionOpen(true);
              else setBuilderOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-heat-100 hover:bg-heat-200 text-white text-xs font-semibold rounded-10 shadow-sm transition-colors"
          >
            {activeMailboxCount === 0 ? <Mail className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {activeMailboxCount === 0 ? "Connect mailbox" : "Create email campaign"}
          </button>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center text-xs text-neutral-500">
          No campaigns match your search or filter.
        </div>
      ) : (
        <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
          <div className="hidden md:grid grid-cols-[minmax(0,1.3fr)_130px_minmax(140px,1fr)_130px_180px] items-center gap-4 border-b border-border-faint bg-neutral-50/70 px-5 py-2.5 text-[11px] font-semibold text-neutral-500">
            <span>Campaign</span>
            <span>Status</span>
            <span>Progress</span>
            <span>Created</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-border-faint">
            {filteredCampaigns.map((campaign) => {
              const mailbox = mailboxes.find((item) => item.id === campaign.mailboxId);
              const total = campaign.counts.total;
              const progress =
                total > 0 ? Math.min(100, Math.round((campaign.counts.sent / total) * 100)) : 0;
              const created = formatCreatedDateTime(campaign.createdAt);
              return (
                <div
                  key={campaign.id}
                  className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.3fr)_130px_minmax(140px,1fr)_130px_180px] md:items-center md:gap-4 px-5 py-4 hover:bg-neutral-50/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-accent-black text-sm truncate">
                      {campaign.name}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                      {campaign.mode === "personalized" ? "AI personalized" : "Shared email"}
                      {campaign.schedule.followUps?.length
                        ? ` · ${campaign.schedule.followUps.length} follow-up${campaign.schedule.followUps.length === 1 ? "" : "s"}`
                        : ""}
                      {" · "}
                      {mailbox?.email ?? "no mailbox"}
                    </p>
                  </div>

                  <div className="flex items-center">
                    <EmailCampaignStatusBadge status={campaign.status} />
                  </div>

                  <div className="space-y-1.5 w-36">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 tabular-nums">
                      <div>
                        <span>{campaign.counts.sent}</span>
                        <span className="text-neutral-400 font-normal"> / {total > 0 ? total : "—"}</span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500 font-medium">{progress}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={campaign.counts.sent}
                      aria-valuemin={0}
                      aria-valuemax={total}
                      aria-label={`${campaign.counts.sent} of ${total} recipients sent`}
                      className="w-full h-1.5 rounded-full bg-neutral-200 overflow-hidden"
                    >
                      <div
                        className="h-full bg-heat-100 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-neutral-500 whitespace-nowrap">
                    <p className="text-xs font-medium text-neutral-700">{created.date}</p>
                    {created.time && (
                      <p className="text-[11px] font-mono text-neutral-400">{created.time}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 md:justify-end">
                    <button
                      type="button"
                      onClick={() => setDetailCampaignId(campaign.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:text-accent-black bg-neutral-100/80 hover:bg-neutral-200/70 rounded-6 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Details
                    </button>
                    {campaign.status === "sending" && (
                      <button
                        type="button"
                        onClick={() => setConfirmTarget({ campaign, action: "pause" })}
                        aria-label="Pause campaign"
                        title="Pause campaign"
                        className="inline-flex items-center justify-center rounded-6 border border-border-faint bg-white p-1.5 text-neutral-500 hover:text-accent-black"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {campaign.status === "paused" && (
                      <button
                        type="button"
                        onClick={() => setConfirmTarget({ campaign, action: "resume" })}
                        aria-label="Resume campaign"
                        title="Resume campaign"
                        className="inline-flex items-center justify-center rounded-6 border border-border-faint bg-white p-1.5 text-neutral-500 hover:text-accent-black"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {["draft", "scheduled", "paused", "sending"].includes(campaign.status) && (
                      <button
                        type="button"
                        onClick={() => setConfirmTarget({ campaign, action: "cancel" })}
                        aria-label="Cancel campaign"
                        title="Cancel campaign"
                        className="inline-flex items-center justify-center rounded-6 border border-border-faint bg-white p-1.5 text-neutral-500 hover:text-red-600"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {["draft", "cancelled", "completed"].includes(campaign.status) && (
                      <button
                        type="button"
                        onClick={() => setConfirmTarget({ campaign, action: "delete" })}
                        aria-label="Delete campaign"
                        title="Delete campaign"
                        className="inline-flex items-center justify-center rounded-6 border border-border-faint bg-white p-1.5 text-neutral-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-border-faint bg-neutral-50/40 flex items-center justify-between gap-2 text-[11px] text-neutral-500">
            <span>
              <span className="font-medium text-neutral-700">
                {filteredCampaigns.length} email campaign{filteredCampaigns.length === 1 ? "" : "s"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSuppressionOpen(true)}
              className="inline-flex items-center gap-1 font-semibold text-neutral-700 hover:text-accent-black"
            >
              <ShieldOff className="w-3.5 h-3.5" />
              Suppression list ({suppressions.length})
            </button>
          </div>
        </div>
      )}

      <SmtpConnectionDialog
        workspaceId={workspaceId}
        open={connectionOpen}
        onClose={() => setConnectionOpen(false)}
        onConnected={(mailbox) => {
          setMailboxes((current) =>
            current.some((item) => item.id === mailbox.id)
              ? current.map((item) => (item.id === mailbox.id ? mailbox : item))
              : [mailbox, ...current],
          );
          setSuccess(`Connected ${mailbox.email}.`);
        }}
      />

      <CampaignBuilderDialog
        workspaceId={workspaceId}
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        mailboxes={mailboxes}
        onCreated={(campaign) => {
          setBuilderOpen(false);
          setCampaigns((current) =>
            current.some((item) => item.id === campaign.id)
              ? current.map((item) => (item.id === campaign.id ? campaign : item))
              : [campaign, ...current],
          );
          setSuccess(
            campaign.status === "scheduled"
              ? `Campaign scheduled for ${new Date(campaign.scheduledStartAt ?? "").toLocaleString()}.`
              : "Campaign activated. Emails are sending in the background.",
          );
        }}
      />

      <EmailCampaignDetailDialog
        workspaceId={workspaceId}
        campaignId={detailCampaignId}
        open={Boolean(detailCampaignId)}
        onClose={() => setDetailCampaignId(null)}
        onChanged={() => void load()}
      />

      <FeatureDialog
        open={suppressionOpen}
        onClose={() => setSuppressionOpen(false)}
        title="Suppression list"
        description="Emails on this list are skipped by every campaign. Recipients can add themselves with the unsubscribe link."
        maxWidthClass="max-w-md"
      >
        <div className="overflow-y-auto p-6">
          {suppressions.length === 0 ? (
            <p className="rounded-12 border border-dashed border-border-faint p-8 text-center text-xs text-neutral-500">
              No suppressed emails yet.
            </p>
          ) : (
            <ul className="divide-y divide-border-faint rounded-12 border border-border-faint">
              {suppressions.map((entry) => (
                <li key={entry.email} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-accent-black">{entry.email}</p>
                    <p className="text-[11px] text-neutral-500 capitalize">
                      {entry.reason.replace("_", " ")} · {formatDate(entry.updated_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await smtpEmailCampaignsApi.deleteSuppression(
                        workspaceId,
                        entry.email,
                      );
                      if (result.status === "ready") {
                        setSuppressions((current) =>
                          current.filter((item) => item.email !== entry.email),
                        );
                      }
                    }}
                    className="rounded-6 p-1 text-neutral-400 hover:bg-neutral-100 hover:text-accent-black"
                    aria-label={`Remove ${entry.email} from suppression list`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FeatureDialog>

      <FeatureDialog
        open={Boolean(confirmTarget)}
        onClose={() => {
          if (!actionLoading) setConfirmTarget(null);
        }}
        title={
          confirmTarget?.action === "pause"
            ? "Pause campaign"
            : confirmTarget?.action === "resume"
              ? "Resume campaign"
              : confirmTarget?.action === "cancel"
                ? "Cancel campaign"
                : "Delete campaign"
        }
        description={confirmTarget?.campaign.name}
        maxWidthClass="max-w-md"
        isSubmitting={actionLoading}
      >
        <div className="p-6 space-y-4">
          <p className="text-xs text-neutral-600 leading-relaxed">
            {confirmTarget?.action === "pause" &&
              "No further emails will send until you resume this campaign."}
            {confirmTarget?.action === "resume" &&
              "Sending continues from where it paused, respecting the schedule and follow-ups."}
            {confirmTarget?.action === "cancel" &&
              "Unsent emails will be skipped. Already-sent emails cannot be recalled. This cannot be undone."}
            {confirmTarget?.action === "delete" &&
              "The campaign and its recipient history will be permanently removed. This cannot be undone."}
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-faint">
            <button
              type="button"
              onClick={() => setConfirmTarget(null)}
              disabled={actionLoading}
              className="rounded-8 border border-border-faint bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={() => void confirmAction()}
              disabled={actionLoading}
              className={`inline-flex items-center gap-1.5 rounded-8 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                confirmTarget?.action === "delete" || confirmTarget?.action === "cancel"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-heat-100 hover:bg-heat-200"
              }`}
            >
              {actionLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : confirmTarget?.action === "pause" ? (
                <Pause className="h-3.5 w-3.5" />
              ) : confirmTarget?.action === "resume" ? (
                <Play className="h-3.5 w-3.5" />
              ) : confirmTarget?.action === "cancel" ? (
                <Ban className="h-3.5 w-3.5" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {confirmTarget?.action === "pause"
                ? "Pause campaign"
                : confirmTarget?.action === "resume"
                  ? "Resume campaign"
                  : confirmTarget?.action === "cancel"
                    ? "Cancel campaign"
                    : "Delete campaign"}
            </button>
          </div>
        </div>
      </FeatureDialog>
    </div>
  );
}
