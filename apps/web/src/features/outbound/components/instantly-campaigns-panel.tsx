"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  KeyRound,
  Loader2,
  Mail,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import { apiIntegrationsRepository } from "@/features/integrations/lib/api-repository";
import type {
  ConnectGoogleMailboxResult,
  InstantlyAccount,
  InstantlyCampaign,
  InstantlyCampaignDetail,
} from "@/features/integrations/lib/types";
import { listAllRunResults, listRuns } from "@/features/lead-generation/lib/client";
import type { LeadGenerationRunSummary } from "@/features/lead-generation/lib/types";

const DEFAULT_BRIEF =
  "We help dental clinics answer every patient call with an AI receptionist that books appointments, follows up with patients, and never misses a lead. Write a short, friendly outbound email offering a 10-minute demo and reference one specific detail about the practice.";

type LeadOption = {
  id: string;
  email: string;
  name?: string;
  company: string;
  website?: string;
  category: string;
  location?: string;
  summary?: string;
  notes?: string;
  fitReasons?: string[];
  runId?: string;
  evidence?: Array<{
    field?: string;
    value?: string;
    source_url?: string;
    quote?: string;
  }>;
  source: "lead_generation" | "manual";
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function StatusPill({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const styles =
    normalized === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized.includes("draft")
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : normalized.includes("pause")
          ? "border-neutral-200 bg-neutral-100 text-neutral-700"
          : normalized.includes("complete")
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-red-200 bg-red-50 text-red-700";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Mail;
}) {
  return (
    <div className="outbound-metric rounded-12 border border-border-faint bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3 text-xs text-neutral-500">
        <span className="font-semibold">{label}</span>
        <span className="outbound-metric-icon">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-[27px] font-bold leading-none tracking-tight text-accent-black">
        {value}
      </div>
      <div className="mt-2 text-[11px] text-neutral-500">{hint}</div>
    </div>
  );
}

export function InstantlyCampaignsPanel({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const [accounts, setAccounts] = useState<InstantlyAccount[]>([]);
  const [campaigns, setCampaigns] = useState<InstantlyCampaign[]>([]);
  const [runs, setRuns] = useState<LeadGenerationRunSummary[]>([]);
  const [runId, setRunId] = useState("");
  const [runLeads, setRunLeads] = useState<LeadOption[]>([]);
  const [leadSource, setLeadSource] = useState<"run" | "manual">("run");
  const [selectedLeads, setSelectedLeads] = useState<LeadOption[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingRunLeads, setLoadingRunLeads] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [fromName, setFromName] = useState("QuickStart AI");
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadCategory, setLeadCategory] = useState("");
  const [leadLocation, setLeadLocation] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [compliance, setCompliance] = useState(false);
  const [creating, setCreating] = useState(false);
  const [composerStep, setComposerStep] = useState<1 | 2 | 3>(1);
  const [generated, setGenerated] = useState<{
    subject: string;
    html: string;
    source: "ai" | "fallback";
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [createProgress, setCreateProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const [draft, setDraft] = useState<InstantlyCampaignDetail | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [activateTarget, setActivateTarget] = useState<InstantlyCampaign | null>(null);
  const [activateMode, setActivateMode] = useState<"activate" | "resume">("activate");
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [campaignActionError, setCampaignActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstantlyCampaign | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);

  const [googleOpen, setGoogleOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googlePassword, setGooglePassword] = useState("");
  const [googleFirstName, setGoogleFirstName] = useState("");
  const [googleLastName, setGoogleLastName] = useState("");
  const [googleDailyLimit, setGoogleDailyLimit] = useState("30");
  const [googleWarmup, setGoogleWarmup] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleResult, setGoogleResult] = useState<ConnectGoogleMailboxResult | null>(null);

  const healthyAccounts = useMemo(() => accounts.filter((account) => account.healthy), [accounts]);
  const unhealthyAccounts = useMemo(
    () => accounts.filter((account) => !account.healthy),
    [accounts],
  );
  const primaryAccount = healthyAccounts[0] ?? accounts[0] ?? null;
  const mailboxHealthy = Boolean(primaryAccount?.healthy);

  const drafts = campaigns.filter((campaign) => campaign.status === 0).length;
  const active = campaigns.filter((campaign) => campaign.status === 1).length;
  const totalLeads = campaigns.reduce((sum, campaign) => sum + (campaign.stats?.leads ?? 0), 0);
  const totalContacted = campaigns.reduce(
    (sum, campaign) => sum + (campaign.stats?.contacted ?? 0),
    0,
  );
  const totalOpens = campaigns.reduce((sum, campaign) => sum + (campaign.stats?.opens ?? 0), 0);
  const openRate = totalContacted > 0 ? Math.round((totalOpens / totalContacted) * 100) : 0;

  const filteredCampaigns = campaigns.filter((campaign) => {
    const query = search.trim().toLowerCase();
    if (query) {
      const haystack = `${campaign.name} ${campaign.leadEmail ?? ""} ${
        campaign.company ?? ""
      } ${campaign.subject}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (statusFilter !== "all") {
      const label = campaign.statusLabel.toLowerCase();
      if (!label.includes(statusFilter)) return false;
    }
    return true;
  });

  const reloadCampaigns = useCallback(async () => {
    const result = await apiIntegrationsRepository.listInstantlyCampaigns(workspaceId);
    if (result.status === "ready") setCampaigns(result.data);
  }, [workspaceId]);

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    const result = await listRuns(workspaceId);
    if (result.data?.items) setRuns(result.data.items);
    setLoadingRuns(false);
  }, [workspaceId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const accountsResult = await apiIntegrationsRepository.listInstantlyAccounts(workspaceId);
    const accountsMessage = "message" in accountsResult ? accountsResult.message : "";
    const needsSetup =
      accountsResult.status !== "ready" && accountsMessage.toLowerCase().includes("not configured");
    setSetupRequired(needsSetup);
    if (accountsResult.status === "ready") {
      setAccounts(accountsResult.data);
    } else if (!needsSetup) {
      setError(accountsMessage || "Failed to load Instantly sending accounts.");
    }

    if (!needsSetup) {
      const campaignsResult = await apiIntegrationsRepository.listInstantlyCampaigns(workspaceId);
      if (campaignsResult.status === "ready") setCampaigns(campaignsResult.data);
      else {
        setError(
          "message" in campaignsResult
            ? campaignsResult.message
            : "Failed to load Instantly campaigns.",
        );
      }
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => {
      void reloadCampaigns();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reloadCampaigns]);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    await load();
    setRefreshing(false);
  }

  function openComposer() {
    setComposerOpen(true);
    setComposerError(null);
    setCampaignName("");
    setBrief(DEFAULT_BRIEF);
    setRunId("");
    setRunLeads([]);
    setSelectedLeads([]);
    setLeadSource("run");
    setLeadEmail("");
    setLeadName("");
    setLeadCompany("");
    setLeadCategory("");
    setLeadLocation("");
    setLeadNotes("");
    setCompliance(false);
    setDraft(null);
    setShowPreview(false);
    setSuccess(null);
    setComposerStep(1);
    setGenerated(null);
    setCreateProgress(null);
    if (runs.length === 0) void loadRuns();
  }

  function openComposerWithBrief(templateBrief: string) {
    setBrief(templateBrief);
    setComposerOpen(true);
    setComposerError(null);
    setCampaignName("");
    setRunId("");
    setRunLeads([]);
    setSelectedLeads([]);
    setLeadSource("run");
    setLeadEmail("");
    setLeadName("");
    setLeadCompany("");
    setLeadCategory("");
    setLeadLocation("");
    setLeadNotes("");
    setCompliance(false);
    setDraft(null);
    setShowPreview(false);
    setSuccess(null);
    setComposerStep(1);
    setGenerated(null);
    setCreateProgress(null);
    if (runs.length === 0) void loadRuns();
  }

  function openGoogleConnect(account?: InstantlyAccount) {
    setGoogleOpen(true);
    setGoogleError(null);
    setGoogleResult(null);
    setGoogleEmail(account?.email ?? "");
    setGooglePassword("");
    setGoogleFirstName(account?.firstName ?? "");
    setGoogleLastName(account?.lastName ?? "");
    setGoogleDailyLimit(String(account?.dailyLimit ?? 30));
    setGoogleWarmup(false);
  }

  async function submitGoogleConnect() {
    const email = googleEmail.trim().toLowerCase();
    const appPassword = googlePassword.replace(/[\s-]+/g, "");
    const firstName = googleFirstName.trim();
    const lastName = googleLastName.trim();
    setGoogleError(null);
    setGoogleResult(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setGoogleError("Enter the Google email address for the sending mailbox.");
      return;
    }
    if (!/^[A-Za-z0-9]{16}$/.test(appPassword)) {
      setGoogleError(
        "Google app passwords are 16 characters. Copy the password from Google without spaces.",
      );
      return;
    }
    if (!firstName || !lastName) {
      setGoogleError("Add the first and last name for the sending account.");
      return;
    }
    setGoogleSubmitting(true);
    const result = await apiIntegrationsRepository.connectInstantlyGoogleAccount(workspaceId, {
      email,
      appPassword,
      firstName,
      lastName,
      dailyLimit: Number(googleDailyLimit) || 30,
      enableWarmup: googleWarmup,
    });
    setGooglePassword("");
    setGoogleSubmitting(false);
    if (result.status !== "ready") {
      setGoogleError(
        "message" in result ? result.message : "Failed to connect the Google mailbox.",
      );
      return;
    }
    setGoogleResult(result.data);
    if (result.data.connected) setSuccess(result.data.message);
    else setGoogleError(result.data.message);
    const accountsResult = await apiIntegrationsRepository.listInstantlyAccounts(workspaceId);
    if (accountsResult.status === "ready") setAccounts(accountsResult.data);
  }

  async function loadRunLeads(nextRunId: string) {
    setRunId(nextRunId);
    setRunLeads([]);
    setSelectedLeads((previous) => previous.filter((lead) => lead.source === "manual"));
    if (!nextRunId) return;
    setLoadingRunLeads(true);
    setComposerError(null);
    const result = await listAllRunResults(workspaceId, nextRunId);
    if (result.error || !result.data) {
      setComposerError(result.error?.message ?? "Failed to load lead generation results.");
      setLoadingRunLeads(false);
      return;
    }
    const leads: LeadOption[] = result.data.items
      .filter((candidate) => candidate.status === "accepted" && candidate.assessment?.email)
      .map((candidate) => {
        const assessment = candidate.assessment!;
        return {
          id: candidate.id,
          email: assessment.email ?? "",
          company: assessment.company_name,
          website: assessment.website,
          category: assessment.category,
          location: assessment.location ?? "",
          summary: assessment.summary,
          fitReasons: assessment.fit_reasons,
          evidence: assessment.evidence,
          runId: nextRunId,
          source: "lead_generation" as const,
        };
      });
    setRunLeads(leads);
    setSelectedLeads((previous) => {
      const manual = previous.filter((lead) => lead.source === "manual");
      const manualEmails = new Set(manual.map((lead) => lead.email));
      return [...manual, ...leads.filter((lead) => !manualEmails.has(lead.email))];
    });
    if (leads.length === 0) {
      setComposerError("This run has no accepted leads with email addresses.");
    }
    setLoadingRunLeads(false);
  }

  function toggleRunLead(lead: LeadOption) {
    if (selectedLeads.some((item) => item.email === lead.email && item.id !== lead.id)) {
      setComposerError("This email is already in your manual leads.");
      return;
    }
    setSelectedLeads((previous) =>
      previous.some((item) => item.id === lead.id)
        ? previous.filter((item) => item.id !== lead.id)
        : [...previous, lead],
    );
  }

  function selectAllRunLeads() {
    setSelectedLeads((previous) => {
      const manual = previous.filter((lead) => lead.source === "manual");
      const manualEmails = new Set(manual.map((lead) => lead.email));
      return [...manual, ...runLeads.filter((lead) => !manualEmails.has(lead.email))];
    });
    setComposerError(null);
  }

  function clearSelectedRunLeads() {
    setSelectedLeads((previous) => previous.filter((item) => item.source !== "lead_generation"));
  }

  function addManualLead() {
    const email = leadEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setComposerError("Enter a valid email address for the manual lead.");
      return;
    }
    if (selectedLeads.some((item) => item.email === email)) {
      setComposerError("That email is already in the selection.");
      return;
    }
    const lead: LeadOption = {
      id: `manual-${email}`,
      email,
      name: leadName.trim(),
      company: leadCompany.trim(),
      category: leadCategory.trim(),
      location: leadLocation.trim(),
      notes: leadNotes.trim(),
      source: "manual",
    };
    setSelectedLeads((previous) => [...previous, lead]);
    setLeadEmail("");
    setLeadName("");
    setLeadCompany("");
    setLeadCategory("");
    setLeadLocation("");
    setLeadNotes("");
    setComposerError(null);
  }

  function removeSelectedLead(leadId: string) {
    setSelectedLeads((previous) => previous.filter((item) => item.id !== leadId));
  }

  function leadPayload(target: LeadOption) {
    return {
      email: target.email,
      name: target.name,
      company: target.company,
      website: target.website,
      category: target.category,
      location: target.location,
      summary: target.summary,
      notes: target.notes,
      runId: target.runId,
      fitReasons: target.fitReasons,
      evidence: target.evidence,
      source: target.source,
    };
  }

  function ensureSendable(): boolean {
    if (healthyAccounts.length === 0) {
      setComposerError(
        "No active sending account. Connect a Google mailbox with an app password and make sure its status is Active.",
      );
      return false;
    }
    return true;
  }

  async function generateEmail() {
    const target = selectedLeads[0];
    if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.email)) {
      setComposerError("Select at least one lead with a valid email before generating.");
      return;
    }
    if (!brief.trim()) {
      setComposerError("Add a campaign brief so the AI can write the email.");
      return;
    }
    if (!ensureSendable()) return;
    setGenerating(true);
    setComposerError(null);
    setGenerated(null);
    const result = await apiIntegrationsRepository.personalizeEmail(workspaceId, {
      lead: leadPayload(target),
      brief,
      fromName,
    });
    setGenerating(false);
    if (result.status !== "ready") {
      setComposerError("message" in result ? result.message : "Failed to personalize the email.");
      return;
    }
    setGenerated({
      subject: result.data.subject,
      html: result.data.html,
      source: result.data.source === "ai" ? "ai" : "fallback",
    });
    setComposerStep(3);
  }

  async function createDrafts() {
    setComposerError(null);
    setSuccess(null);
    setDraft(null);
    if (!compliance) {
      setComposerError("Confirm that this outreach complies with applicable email law.");
      return;
    }
    if (!ensureSendable()) return;
    if (selectedLeads.length === 0) {
      setComposerError("Select at least one lead before creating the campaign.");
      return;
    }
    if (selectedLeads.length > 50) {
      setComposerError("Select up to 50 leads per campaign run.");
      return;
    }
    const selectedTargets = selectedLeads
      .filter((target) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.email))
      .slice(0, 50);
    if (selectedTargets.length === 0) {
      setComposerError("Add at least one valid lead email.");
      return;
    }

    setCreating(true);
    let created = 0;
    let last: InstantlyCampaignDetail | null = null;
    let firstError: string | null = null;

    const useReviewed = selectedTargets.length === 1 && generated;
    if (useReviewed) {
      const target = selectedTargets[0];
      setCreateProgress({ current: 1, total: 1, label: "Creating draft in Instantly…" });
      const campaign = await apiIntegrationsRepository.createInstantlyCampaign(workspaceId, {
        name: campaignName.trim()
          ? `${campaignName.trim()} — ${target.company || target.email}`
          : undefined,
        subject: generated.subject,
        html: generated.html,
        lead: leadPayload(target),
        confirmCompliance: true,
      });
      if (campaign.status !== "ready") {
        firstError =
          "message" in campaign ? campaign.message : "Failed to create the Instantly campaign.";
      } else {
        created = 1;
        last = campaign.data;
      }
    } else {
      for (const [index, target] of selectedTargets.entries()) {
        setCreateProgress({
          current: index + 1,
          total: selectedTargets.length,
          label: `Generating and creating draft ${index + 1} of ${selectedTargets.length}`,
        });
        const personalized = await apiIntegrationsRepository.personalizeEmail(workspaceId, {
          lead: leadPayload(target),
          brief,
          fromName,
        });
        if (personalized.status !== "ready") {
          firstError =
            "message" in personalized
              ? personalized.message
              : "Failed to personalize the email for this lead.";
          continue;
        }
        const campaign = await apiIntegrationsRepository.createInstantlyCampaign(workspaceId, {
          name: campaignName.trim()
            ? `${campaignName.trim()} — ${target.company || target.email}`
            : undefined,
          subject: personalized.data.subject,
          html: personalized.data.html,
          lead: leadPayload(target),
          confirmCompliance: true,
        });
        if (campaign.status !== "ready") {
          firstError =
            "message" in campaign ? campaign.message : "Failed to create the Instantly campaign.";
          continue;
        }
        created += 1;
        last = campaign.data;
      }
    }

    setCreateProgress(null);
    if (last) {
      setDraft(last);
      setShowPreview(true);
      setSuccess(
        `Created ${created} Instantly draft${created === 1 ? "" : "s"}. Review, then activate when ready.`,
      );
      await reloadCampaigns();
    }
    if (firstError) setComposerError(firstError);
    setCreating(false);
  }

  function openActivate(campaign: InstantlyCampaign) {
    setActivateMode("activate");
    setActivateTarget(campaign);
    setActivateError(null);
  }

  function openResume(campaign: InstantlyCampaign) {
    setActivateMode("resume");
    setActivateTarget(campaign);
    setActivateError(null);
  }

  async function pauseCampaign(campaign: InstantlyCampaign) {
    setActionLoadingId(campaign.id);
    setCampaignActionError(null);
    const result = await apiIntegrationsRepository.pauseInstantlyCampaign(workspaceId, campaign.id);
    if (result.status === "ready") {
      setSuccess("Campaign paused. Instantly will stop sending until it is resumed.");
      await reloadCampaigns();
    } else {
      setCampaignActionError(
        "message" in result ? result.message : "Failed to pause the campaign.",
      );
    }
    setActionLoadingId(null);
  }

  function openDelete(campaign: InstantlyCampaign) {
    setDeleteTarget(campaign);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await apiIntegrationsRepository.deleteInstantlyCampaign(
      workspaceId,
      deleteTarget.id,
    );
    if (result.status === "ready") {
      setSuccess("Campaign deleted.");
      setDeleteTarget(null);
      await reloadCampaigns();
    } else {
      setDeleteError("message" in result ? result.message : "Failed to delete the campaign.");
    }
    setDeleting(false);
  }

  async function confirmActivate() {
    if (!activateTarget) return;
    setActivating(true);
    setActivateError(null);
    const result =
      activateMode === "resume"
        ? await apiIntegrationsRepository.resumeInstantlyCampaign(workspaceId, activateTarget.id)
        : await apiIntegrationsRepository.activateInstantlyCampaign(workspaceId, activateTarget.id);
    if (result.status === "ready") {
      setActivateTarget(null);
      setDraft(null);
      setSuccess(
        activateMode === "resume"
          ? "Campaign resumed. Instantly will continue sending from your connected accounts."
          : "Campaign activated. Instantly will start sending from your connected accounts.",
      );
      await reloadCampaigns();
    } else {
      setActivateError(
        "message" in result
          ? result.message
          : activateMode === "resume"
            ? "Failed to resume campaign."
            : "Failed to activate campaign.",
      );
    }
    setActivating(false);
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 rounded-8 bg-neutral-100 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 rounded-12 border border-border-faint bg-white animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="outbound-campaigns space-y-6 max-w-7xl mx-auto">
      <div className="outbound-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="outbound-eyebrow">
            <span className="outbound-eyebrow-icon">
              <Mail className="h-3.5 w-3.5" />
            </span>{" "}
            Campaigns / Email
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-accent-black">
            Outbound email
          </h1>
          <p className="mt-1.5 text-xs text-neutral-500">
            Create personal outreach, review each draft, and follow sending progress in one place.
          </p>
        </div>
        <div className="outbound-header-actions flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing || setupRequired}
            className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {!setupRequired && (
            <button
              type="button"
              onClick={openComposer}
              disabled={healthyAccounts.length === 0}
              title={
                healthyAccounts.length === 0 ? "Connect an active sending mailbox first" : undefined
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-8 bg-heat-100 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-heat-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Create campaign
            </button>
          )}
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <MetricCard
            label="Campaigns"
            value={campaigns.length.toLocaleString()}
            hint={`${active} active · ${drafts} draft${drafts === 1 ? "" : "s"}`}
            icon={Mail}
          />
          <MetricCard
            label="Leads"
            value={totalLeads.toLocaleString()}
            hint="recipients across campaigns"
            icon={Users}
          />
          <MetricCard
            label="Sent"
            value={totalContacted.toLocaleString()}
            hint={`of ${totalLeads.toLocaleString()} leads reached`}
            icon={Send}
          />
          <MetricCard
            label="Open rate"
            value={`${openRate}%`}
            hint={`${totalOpens.toLocaleString()} opens recorded`}
            icon={Eye}
          />
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-12 border border-green-200 bg-[#E9F9EF] p-4 text-xs text-[#027A48]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      {error && !setupRequired && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-12 border border-red-200 bg-red-50 p-4 text-xs text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!setupRequired && (
        <div className="outbound-mailbox-card rounded-12 border border-border-faint bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-10 border ${
                  mailboxHealthy
                    ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                    : "border-amber-100 bg-amber-50 text-amber-600"
                }`}
              >
                {mailboxHealthy ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <KeyRound className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Sending account
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <p className="truncate text-xs font-semibold text-accent-black">
                    {primaryAccount?.email ?? "Not connected"}
                  </p>
                  {primaryAccount && <StatusPill label={primaryAccount.statusLabel} />}
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {primaryAccount
                    ? `Warmup ${primaryAccount.warmupStatus === 1 ? "on" : "off"} · ${
                        primaryAccount.dailyLimit ?? 30
                      } emails/day`
                    : "Connect Gmail or Google Workspace with an app password."}
                  {unhealthyAccounts.length > 0 && healthyAccounts.length > 0
                    ? ` · ${unhealthyAccounts.length} needs attention`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {unhealthyAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => openGoogleConnect(unhealthyAccounts[0])}
                  className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-4 py-2 text-xs font-semibold text-white hover:bg-heat-200"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Reconnect mailbox
                </button>
              )}
              <button
                type="button"
                onClick={() => openGoogleConnect()}
                className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {primaryAccount ? "Add mailbox" : "Connect Google mailbox"}
              </button>
            </div>
          </div>
          {primaryAccount?.statusMessage && !mailboxHealthy && (
            <p className="mt-3 rounded-8 border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-800">
              {primaryAccount.statusMessage}
            </p>
          )}
          {accounts.length > 1 && (
            <div className="outbound-account-list mt-4 border-t border-border-faint pt-3">
              {accounts.map((account) => (
                <div
                  key={account.email}
                  className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="truncate font-medium text-accent-black">{account.email}</span>
                    <StatusPill label={account.statusLabel} />
                  </div>
                  <span className="text-neutral-500">{account.dailyLimit ?? 30} emails/day</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {campaignActionError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-12 border border-red-200 bg-red-50 p-4 text-xs text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {campaignActionError}
        </div>
      )}

      {setupRequired ? (
        <div className="max-w-2xl mx-auto rounded-16 border border-border-faint bg-white p-8 shadow-xs space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-12 border border-orange-100 bg-orange-50 text-heat-100">
            <Send className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-accent-black">Email campaigns need setup</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Ask your workspace administrator to finish the Instantly integration. Once it is
              ready, you can connect a mailbox and create your first campaign here.
            </p>
          </div>
          <Link
            href={`/workspaces/${workspaceId}/integrations`}
            className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            View integrations <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          <div className="outbound-list-heading flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-bold tracking-tight text-accent-black">Campaigns</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Manage drafts and monitor every email campaign.
              </p>
            </div>
            <span className="text-xs font-medium text-neutral-500">{campaigns.length} total</span>
          </div>
          {campaigns.length > 0 && (
            <div className="outbound-toolbar flex flex-col gap-3 rounded-12 border border-border-faint bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search campaign, lead, or company..."
                  aria-label="Search outbound campaigns"
                  className="w-full rounded-8 border border-neutral-200 bg-neutral-50 py-1.5 pl-9 pr-3 text-xs text-accent-black placeholder:text-neutral-400 focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="instantly-status-filter"
                  className="shrink-0 text-xs font-medium text-neutral-500"
                >
                  Status:
                </label>
                <select
                  id="instantly-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-8 border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Drafts</option>
                  <option value="active">Active</option>
                  <option value="pause">Paused</option>
                  <option value="complete">Completed</option>
                </select>
              </div>
            </div>
          )}

          {campaigns.length === 0 ? (
            <div className="mx-auto max-w-2xl space-y-5 rounded-16 border border-border-faint bg-white p-8 text-center shadow-xs sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-heat-100 shadow-xs">
                {healthyAccounts.length === 0 ? (
                  <KeyRound className="h-7 w-7" />
                ) : (
                  <Send className="h-7 w-7" />
                )}
              </div>
              {healthyAccounts.length === 0 ? (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-accent-black">
                      {accounts.length === 0
                        ? "Connect a sending mailbox"
                        : "Sending account needs attention"}
                    </h2>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-neutral-500">
                      {accounts.length === 0
                        ? "Use a Google app password to connect Gmail or Google Workspace. You don't need to log in to Instantly to add the mailbox."
                        : (unhealthyAccounts[0]?.statusMessage ??
                          "The connected mailbox is not active. Reconnect it with a fresh Google app password.")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openGoogleConnect(unhealthyAccounts[0])}
                      className="inline-flex items-center gap-2 rounded-10 bg-heat-100 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-heat-200"
                    >
                      <KeyRound className="h-4 w-4" />
                      Connect Google mailbox
                    </button>
                    <button
                      type="button"
                      onClick={() => void refresh()}
                      disabled={refreshing}
                      className="inline-flex items-center gap-2 rounded-10 border border-border-faint bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-accent-black">
                      No outbound campaigns yet
                    </h2>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-neutral-500">
                      Pick a lead-generation run or enter a lead manually, let the AI write the
                      email, review it, then activate the campaign from this page.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 text-left sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        openComposerWithBrief(
                          "We help dental clinics answer every patient call with an AI receptionist that books appointments, follows up with patients, and never misses a lead. Write a short, friendly outbound email offering a 10-minute demo and reference one specific detail about the practice.",
                        )
                      }
                      className="rounded-12 border border-neutral-200/70 bg-neutral-50 p-4 text-left transition-all hover:border-orange-200 hover:bg-orange-50/50"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-8 bg-orange-100/80 text-heat-100">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="mt-2 text-xs font-bold text-accent-black">
                        Dental clinic outreach
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-neutral-500">
                        Offer an AI receptionist demo with one personalized detail about the
                        practice.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openComposerWithBrief(
                          "Write a short follow-up email for a lead who requested a product demo but hasn't booked a time. Offer two specific time slots this week and keep it under 100 words.",
                        )
                      }
                      className="rounded-12 border border-neutral-200/70 bg-neutral-50 p-4 text-left transition-all hover:border-orange-200 hover:bg-orange-50/50"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-8 bg-blue-100/80 text-blue-700">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="mt-2 text-xs font-bold text-accent-black">Demo follow-up</div>
                      <p className="mt-1 text-[11px] leading-snug text-neutral-500">
                        Re-engage leads who showed interest but never booked a time.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openComposerWithBrief(
                          "Write a warm re-engagement email for a practice that went quiet. Reference something specific about them, offer a quick 10-minute call, and keep it under 100 words.",
                        )
                      }
                      className="rounded-12 border border-neutral-200/70 bg-neutral-50 p-4 text-left transition-all hover:border-orange-200 hover:bg-orange-50/50"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-8 bg-emerald-100/80 text-emerald-700">
                        <RefreshCw className="h-4 w-4" />
                      </div>
                      <div className="mt-2 text-xs font-bold text-accent-black">Re-engagement</div>
                      <p className="mt-1 text-[11px] leading-snug text-neutral-500">
                        Bring back quiet leads with a short, personalized message.
                      </p>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={openComposer}
                    className="inline-flex items-center gap-2 rounded-10 bg-heat-100 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-heat-200"
                  >
                    <Plus className="h-4 w-4" />
                    Create campaign from scratch
                  </button>
                </>
              )}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="rounded-12 border border-border-faint bg-white p-8 text-center text-xs text-neutral-500 shadow-xs">
              No campaigns match your search or filter.
            </div>
          ) : (
            <div className="outbound-list overflow-hidden rounded-12 border border-border-faint bg-white shadow-xs">
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-faint bg-neutral-50/70 text-[11px] font-semibold text-neutral-500">
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-3 py-3">Recipient</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 min-w-[170px]">Delivery</th>
                      <th className="px-3 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-faint">
                    {filteredCampaigns.map((campaign) => (
                      <tr key={campaign.id} className="transition-colors hover:bg-neutral-50/60">
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="outbound-row-icon">
                              <Mail className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-bold text-accent-black">
                                {campaign.name}
                              </span>
                              <span className="mt-1 block truncate text-[11px] text-neutral-500">
                                {campaign.subject || "No subject"}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-neutral-700">
                          <div className="font-semibold">
                            {campaign.leadName || campaign.company || "—"}
                          </div>
                          <div className="max-w-[180px] truncate text-[11px] text-neutral-500">
                            {campaign.leadEmail || "—"}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <StatusPill label={campaign.statusLabel} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-neutral-500">
                              <span>
                                {campaign.stats?.contacted ?? 0} of {campaign.stats?.leads ?? 0}{" "}
                                sent
                              </span>
                              <span className="font-mono font-semibold text-neutral-700">
                                {campaign.stats?.leads
                                  ? Math.min(
                                      100,
                                      Math.round(
                                        ((campaign.stats?.contacted ?? 0) / campaign.stats.leads) *
                                          100,
                                      ),
                                    )
                                  : 0}
                                %
                              </span>
                            </div>
                            <div className="w-full overflow-hidden rounded-full bg-neutral-100 h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-heat-100 transition-all duration-300"
                                style={{
                                  width: `${
                                    campaign.stats?.leads
                                      ? Math.min(
                                          100,
                                          Math.round(
                                            ((campaign.stats?.contacted ?? 0) /
                                              campaign.stats.leads) *
                                              100,
                                          ),
                                        )
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            {(campaign.stats?.opens ?? 0) > 0 && (
                              <p className="text-[10px] text-neutral-400">
                                {campaign.stats.opens} opens · {campaign.stats.replies} replies
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[11px] text-neutral-600">
                          {formatDate(campaign.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailCampaignId(campaign.id)}
                              className="inline-flex items-center gap-1 rounded-6 border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-heat-100 hover:bg-orange-100"
                            >
                              <Eye className="h-3 w-3" />
                              Details
                            </button>
                            {campaign.status === 0 && !campaign.activatedAt && (
                              <button
                                type="button"
                                onClick={() => openActivate(campaign)}
                                disabled={actionLoadingId === campaign.id}
                                className="inline-flex items-center gap-1 rounded-6 bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <Send className="h-3 w-3" />
                                Activate
                              </button>
                            )}
                            {campaign.status === 1 && (
                              <button
                                type="button"
                                onClick={() => void pauseCampaign(campaign)}
                                disabled={actionLoadingId === campaign.id}
                                className="inline-flex items-center gap-1 rounded-6 border border-border-faint bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                              >
                                {actionLoadingId === campaign.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Pause className="h-3 w-3" />
                                )}
                                Pause
                              </button>
                            )}
                            {campaign.status === 2 && (
                              <button
                                type="button"
                                onClick={() => openResume(campaign)}
                                className="inline-flex items-center gap-1 rounded-6 bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                <Play className="h-3 w-3" />
                                Resume
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openDelete(campaign)}
                              aria-label="Delete campaign"
                              title="Delete campaign"
                              className="inline-flex items-center justify-center rounded-6 border border-border-faint bg-white p-1.5 text-neutral-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-border-faint md:hidden">
                {filteredCampaigns.map((campaign) => (
                  <div key={`mobile-${campaign.id}`} className="space-y-2.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-accent-black">
                          {campaign.name}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-neutral-500">
                          {campaign.subject || "No subject"}
                        </div>
                      </div>
                      <StatusPill label={campaign.statusLabel} />
                    </div>
                    <p className="truncate text-[11px] text-neutral-600">
                      To {campaign.leadEmail || "No lead"} · {formatDate(campaign.createdAt)}
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span>
                          {campaign.stats?.contacted ?? 0} of {campaign.stats?.leads ?? 0} sent
                        </span>
                        <span className="font-mono font-semibold text-neutral-700">
                          {campaign.stats?.leads
                            ? Math.min(
                                100,
                                Math.round(
                                  ((campaign.stats?.contacted ?? 0) / campaign.stats.leads) * 100,
                                ),
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full overflow-hidden rounded-full bg-neutral-100 h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-heat-100"
                          style={{
                            width: `${
                              campaign.stats?.leads
                                ? Math.min(
                                    100,
                                    Math.round(
                                      ((campaign.stats?.contacted ?? 0) / campaign.stats.leads) *
                                        100,
                                    ),
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      {(campaign.stats?.opens ?? 0) > 0 && (
                        <p className="text-[10px] text-neutral-400">
                          {campaign.stats.opens} opens · {campaign.stats.replies} replies
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 border-t border-neutral-100 pt-2 text-[11px] text-neutral-600">
                      <button
                        type="button"
                        onClick={() => setDetailCampaignId(campaign.id)}
                        className="inline-flex items-center gap-1 font-semibold text-neutral-700"
                      >
                        <Eye className="h-3 w-3" />
                        Details
                      </button>
                      {campaign.status === 0 && !campaign.activatedAt && (
                        <button
                          type="button"
                          onClick={() => openActivate(campaign)}
                          className="inline-flex items-center gap-1 font-semibold text-emerald-700"
                        >
                          <Send className="h-3 w-3" />
                          Activate
                        </button>
                      )}
                      {campaign.status === 1 && (
                        <button
                          type="button"
                          onClick={() => void pauseCampaign(campaign)}
                          disabled={actionLoadingId === campaign.id}
                          className="inline-flex items-center gap-1 font-semibold text-neutral-600 disabled:opacity-50"
                        >
                          <Pause className="h-3 w-3" />
                          Pause
                        </button>
                      )}
                      {campaign.status === 2 && (
                        <button
                          type="button"
                          onClick={() => openResume(campaign)}
                          className="inline-flex items-center gap-1 font-semibold text-emerald-700"
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openDelete(campaign)}
                        aria-label="Delete campaign"
                        className="inline-flex items-center gap-1 font-semibold text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 border-t border-border-faint bg-neutral-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-500">
                <span>
                  <span className="font-medium text-neutral-700">
                    {filteredCampaigns.length} campaigns
                  </span>
                  <span className="mx-2">·</span>
                  <span>
                    {totalLeads} leads · {totalContacted} sent · {totalOpens} opens
                  </span>
                </span>
                <span>Review and activate drafts from this page.</span>
              </div>
            </div>
          )}
        </>
      )}

      <FeatureDialog
        open={composerOpen}
        onClose={() => {
          if (!creating && !generating) setComposerOpen(false);
        }}
        title="New outbound campaign"
        description="Pick a lead, let the AI write the email, review it, then create the draft."
        maxWidthClass="max-w-4xl"
        roundedClass="outbound-dialog outbound-composer rounded-16"
        isSubmitting={creating || generating}
      >
        <div className="outbound-composer-body space-y-5">
          <ol
            className="outbound-steps flex items-center gap-2"
            aria-label="Campaign creation steps"
          >
            {[
              { n: 1, label: "Lead" },
              { n: 2, label: "Email" },
              { n: 3, label: "Review" },
            ].map((step, index) => {
              const done = composerStep > step.n;
              const current = composerStep === step.n;
              return (
                <li key={step.n} className={`flex items-center gap-2 ${index < 2 ? "flex-1" : ""}`}>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      done
                        ? "bg-emerald-600 text-white"
                        : current
                          ? "bg-heat-100 text-white"
                          : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : step.n}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      current ? "text-accent-black" : done ? "text-emerald-700" : "text-neutral-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < 2 && (
                    <span
                      className={`h-px flex-1 ${composerStep > step.n ? "bg-emerald-500" : "bg-neutral-200"}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <div className="outbound-step-intro">
            <p className="outbound-section-kicker">Step {composerStep} of 3</p>
            <h3>
              {composerStep === 1
                ? "Choose your audience"
                : composerStep === 2
                  ? "Write your outreach"
                  : "Review your draft"}
            </h3>
            <p>
              {composerStep === 1
                ? "Select people from a lead run or add them yourself."
                : composerStep === 2
                  ? "Give the AI clear context and preview the message before creating drafts."
                  : "Check the recipients, mailbox, and message before saving."}
            </p>
          </div>

          {composerError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-8 border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {composerError}
            </div>
          )}

          {composerStep === 1 && (
            <>
              <section className="outbound-form-section space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    Lead source
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    {selectedLeads.length} selected
                  </span>
                </div>

                <div className="outbound-audience-heading">
                  <p>Select leads from a run, then add any extra contacts manually.</p>
                  <button
                    type="button"
                    aria-expanded={leadSource === "manual"}
                    onClick={() =>
                      setLeadSource((current) => (current === "manual" ? "run" : "manual"))
                    }
                    className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-2 text-xs font-semibold text-accent-black hover:border-heat-100 hover:text-heat-100"
                  >
                    <Plus className="h-4 w-4" />
                    {leadSource === "manual" ? "Hide manual entry" : "Add lead manually"}
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block space-y-1 text-xs font-semibold text-accent-black">
                    Lead generation run
                    <select
                      value={runId}
                      onChange={(event) => void loadRunLeads(event.target.value)}
                      disabled={loadingRuns}
                      className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100 disabled:opacity-60"
                    >
                      <option value="">
                        {loadingRuns ? "Loading runs…" : "Select a lead run"}
                      </option>
                      {runs.map((run) => (
                        <option key={run.id} value={run.id}>
                          {run.status} · {run.accepted ?? 0} accepted
                          {run.created_at
                            ? ` · ${new Date(run.created_at).toLocaleDateString()}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  {runLeads.length > 0 && (
                    <div className="rounded-12 border border-border-faint bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-neutral-500">
                          {runLeads.length} accepted leads
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllRunLeads}
                            className="text-[11px] font-semibold text-heat-100 hover:text-heat-200"
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            onClick={clearSelectedRunLeads}
                            className="text-[11px] font-semibold text-neutral-500 hover:text-accent-black"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 max-h-64 divide-y divide-border-faint overflow-y-auto">
                        {runLeads.map((lead) => {
                          const checked = selectedLeads.some((item) => item.id === lead.id);
                          return (
                            <label
                              key={lead.id}
                              className="flex cursor-pointer items-start gap-2.5 py-2"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRunLead(lead)}
                                className="mt-0.5 accent-[#FF571A]"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-semibold text-accent-black">
                                  {lead.company}
                                </span>
                                <span className="block truncate font-mono text-[11px] text-neutral-500">
                                  {lead.email}
                                </span>
                                {lead.location ? (
                                  <span className="block truncate text-[11px] text-neutral-400">
                                    {lead.location}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {loadingRunLeads && (
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-heat-100" />
                      Loading accepted leads…
                    </div>
                  )}
                </div>
                {leadSource === "manual" && (
                  <div className="outbound-manual-entry grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1 text-xs font-semibold text-accent-black">
                      Email
                      <input
                        type="email"
                        value={leadEmail}
                        onChange={(event) => setLeadEmail(event.target.value)}
                        placeholder="lead@example.com"
                        className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold text-accent-black">
                      Contact name
                      <input
                        value={leadName}
                        onChange={(event) => setLeadName(event.target.value)}
                        placeholder="Optional"
                        className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold text-accent-black">
                      Company
                      <input
                        value={leadCompany}
                        onChange={(event) => setLeadCompany(event.target.value)}
                        placeholder="Company or practice"
                        className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold text-accent-black">
                      Category
                      <input
                        value={leadCategory}
                        onChange={(event) => setLeadCategory(event.target.value)}
                        placeholder="Dental clinic"
                        className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold text-accent-black">
                      Location
                      <input
                        value={leadLocation}
                        onChange={(event) => setLeadLocation(event.target.value)}
                        placeholder="City or region"
                        className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                      />
                    </label>
                    <label className="block space-y-1 text-xs font-semibold text-accent-black sm:col-span-2">
                      Notes / context
                      <textarea
                        value={leadNotes}
                        onChange={(event) => setLeadNotes(event.target.value)}
                        rows={3}
                        placeholder="Any detail the AI should use from the research or from you."
                        className="w-full resize-y rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                      />
                    </label>
                    <div className="flex items-center justify-end sm:col-span-2">
                      <button
                        type="button"
                        onClick={addManualLead}
                        className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-4 py-2 text-xs font-semibold text-white hover:bg-heat-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add lead
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {selectedLeads.length > 0 && (
                <section className="outbound-form-section space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-accent-black">Selected leads</h3>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-heat-100">
                      {selectedLeads.length}
                    </span>
                  </div>
                  <div className="outbound-selected-list">
                    {selectedLeads.map((lead) => (
                      <div key={lead.id} className="outbound-selected-lead">
                        <span className="outbound-selected-lead-icon">
                          {lead.source === "manual" ? (
                            <Plus className="h-3.5 w-3.5" />
                          ) : (
                            <Users className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate">
                            {lead.company || lead.name || lead.email}
                          </strong>
                          <small className="block truncate">
                            {lead.email} · {lead.source === "manual" ? "Manual" : "Lead run"}
                          </small>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelectedLead(lead.id)}
                          aria-label={`Remove ${lead.email}`}
                          className="rounded-6 p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="outbound-form-actions flex items-center justify-end gap-2 border-t border-border-faint pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!creating && !generating) setComposerOpen(false);
                  }}
                  className="rounded-8 border border-border-faint bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLeads.length === 0) {
                      setComposerError("Select or add at least one lead before continuing.");
                      return;
                    }
                    setComposerError(null);
                    setComposerStep(2);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-4 py-2 text-xs font-semibold text-white hover:bg-heat-200"
                >
                  Continue to email
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}

          {composerStep === 2 && (
            <>
              <section className="outbound-form-section grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-semibold text-accent-black">
                  Campaign name
                  <input
                    value={campaignName}
                    onChange={(event) => setCampaignName(event.target.value)}
                    placeholder="Optional, e.g. Dental outreach — October"
                    className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                  />
                </label>
                <label className="block space-y-1 text-xs font-semibold text-accent-black">
                  AI sign-off name
                  <input
                    value={fromName}
                    onChange={(event) => setFromName(event.target.value)}
                    className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                  />
                </label>
                <label className="block space-y-1 text-xs font-semibold text-accent-black sm:col-span-2">
                  Campaign brief
                  <textarea
                    value={brief}
                    onChange={(event) => setBrief(event.target.value)}
                    rows={5}
                    className="w-full resize-y rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                  />
                  <span className="block text-[11px] font-normal text-neutral-500">
                    The AI writes a unique subject and body for this lead. You can review the draft
                    before creating the campaign.
                  </span>
                </label>
              </section>
              <div className="outbound-form-actions flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setComposerError(null);
                    setComposerStep(1);
                  }}
                  className="rounded-8 border border-border-faint bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void generateEmail()}
                  disabled={generating || healthyAccounts.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 rounded-8 bg-heat-100 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-heat-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {generating ? "Writing email…" : "Generate with AI"}
                </button>
              </div>
              {generating && (
                <div className="rounded-8 border border-border-faint bg-white p-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-heat-100" />
                    Writing a personalized subject and body for{" "}
                    {selectedLeads[0]?.email || "the lead"}
                    {selectedLeads.length > 1
                      ? ` and ${selectedLeads.length - 1} more lead${selectedLeads.length - 1 === 1 ? "" : "s"}`
                      : ""}
                    …
                  </div>
                </div>
              )}
              {generated && (
                <div className="outbound-email-preview rounded-12 border border-border-faint bg-neutral-50/70 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-accent-black">{generated.subject}</p>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        {generated.source === "ai" ? "AI generated" : "Template fallback"} · ready
                        for review
                      </p>
                    </div>
                  </div>
                  <iframe
                    title="Generated email preview"
                    srcDoc={generated.html}
                    sandbox=""
                    className="mt-3 h-64 w-full rounded-8 border border-border-faint bg-white"
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void generateEmail()}
                      disabled={generating}
                      className="rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setComposerError(null);
                        setComposerStep(3);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-4 py-2 text-xs font-semibold text-white hover:bg-heat-200"
                    >
                      Continue to review
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {composerStep === 3 && (
            <>
              <div className="outbound-review rounded-12 border border-border-faint bg-neutral-50/70 p-4 space-y-3">
                {healthyAccounts.length === 0 && (
                  <div className="rounded-8 border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                    <p className="font-semibold">
                      {accounts.length === 0
                        ? "No sending mailbox connected"
                        : "Sending account needs attention"}
                    </p>
                    <p className="mt-0.5">
                      {accounts.length === 0
                        ? "Connect Gmail or Google Workspace with a Google app password. You don't need to log in to Instantly."
                        : (unhealthyAccounts[0]?.statusMessage ??
                          "Reconnect the mailbox with a fresh Google app password before sending.")}
                    </p>
                    <button
                      type="button"
                      onClick={() => openGoogleConnect(unhealthyAccounts[0])}
                      className="mt-2 inline-flex items-center gap-1 font-semibold text-amber-900 underline underline-offset-2"
                    >
                      <KeyRound className="h-3 w-3" />
                      Connect Google mailbox
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-neutral-500">Sending accounts</span>
                  <span className="font-medium text-accent-black">
                    {healthyAccounts.length > 0
                      ? healthyAccounts.map((account) => account.email).join(", ")
                      : "No active accounts"}
                  </span>
                </div>
                {generated && (
                  <div className="rounded-8 border border-border-faint bg-white p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-neutral-500">Leads</span>
                      <span className="text-right font-medium text-accent-black">
                        {selectedLeads[0]?.email || "—"}
                        {selectedLeads.length > 1 ? ` +${selectedLeads.length - 1} more` : ""}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <span className="text-neutral-500">Subject</span>
                      <span className="text-right font-semibold text-accent-black">
                        {generated.subject}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComposerStep(2)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-heat-100 underline underline-offset-2"
                    >
                      Edit email
                    </button>
                  </div>
                )}
                <label className="flex items-start gap-2 rounded-8 border border-border-faint bg-white p-3 text-[11px] leading-relaxed text-neutral-600">
                  <input
                    type="checkbox"
                    checked={compliance}
                    onChange={(event) => setCompliance(event.target.checked)}
                    className="mt-0.5 accent-[#FF571A]"
                  />
                  <span>
                    I confirm this outreach complies with the applicable email law and includes an
                    opt-out. Instantly will send from the connected account after activation.
                  </span>
                </label>
              </div>

              {createProgress && (
                <div className="space-y-1.5 rounded-8 border border-border-faint bg-white p-3">
                  <div className="flex items-center justify-between text-[11px] text-neutral-600">
                    <span>{createProgress.label}</span>
                    <span className="font-mono font-semibold text-accent-black">
                      {createProgress.current}/{createProgress.total}
                    </span>
                  </div>
                  <div className="w-full overflow-hidden rounded-full bg-neutral-100 h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-heat-100 transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          (createProgress.current / createProgress.total) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="outbound-form-actions flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setComposerError(null);
                    setComposerStep(2);
                  }}
                  disabled={creating}
                  className="rounded-8 border border-border-faint bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void createDrafts()}
                  disabled={creating || healthyAccounts.length === 0 || Boolean(draft)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-8 bg-heat-100 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-heat-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {draft
                    ? "Drafts created"
                    : creating
                      ? "Creating drafts…"
                      : `Create ${selectedLeads.length} draft${selectedLeads.length === 1 ? "" : "s"}`}
                </button>
              </div>

              {draft && (
                <div className="space-y-3 rounded-12 border border-border-faint bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-accent-black">Draft ready</h3>
                      <p className="mt-1 truncate text-xs font-semibold text-accent-black">
                        {draft.subject || "Generated email"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        To: {draft.leadEmail || "—"} · {draft.statusLabel}
                      </p>
                    </div>
                    <StatusPill label={draft.statusLabel} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview((value) => !value)}
                      className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {showPreview ? "Hide preview" : "Preview"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setComposerOpen(false);
                        openActivate(draft);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-8 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Activate campaign
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerOpen(false)}
                      className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      View campaigns
                    </button>
                  </div>
                  {showPreview && (
                    <iframe
                      title="Email draft preview"
                      srcDoc={draft.body}
                      sandbox=""
                      className="h-72 w-full rounded-8 border border-border-faint bg-white"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </FeatureDialog>

      <FeatureDialog
        open={Boolean(activateTarget)}
        onClose={() => {
          if (!activating) setActivateTarget(null);
        }}
        title={
          activateMode === "resume" ? "Resume outbound campaign" : "Activate outbound campaign"
        }
        description={
          activateMode === "resume"
            ? "Sending will continue from your connected mailbox."
            : "Sending will start from your connected mailbox."
        }
        maxWidthClass="max-w-md"
        roundedClass="outbound-dialog outbound-confirm-dialog rounded-16"
        isSubmitting={activating}
      >
        <div className="space-y-4">
          <div className="outbound-confirm-summary rounded-12 border border-border-faint bg-neutral-50/70 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Campaign</span>
              <span className="text-right font-semibold text-accent-black">
                {activateTarget?.name}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Lead</span>
              <span className="font-mono text-accent-black">
                {activateTarget?.leadEmail || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Accounts</span>
              <span className="font-mono text-accent-black">
                {activateTarget?.accounts.length ?? 0}
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-neutral-600">
            {activateMode === "resume"
              ? "Resuming continues this campaign from where it paused. Make sure the sending mailbox is active and the outreach is lawful for the lead."
              : "Activation starts the campaign. Make sure the sending mailbox is active and that this outreach is lawful for the lead. You can pause it again from this page."}
          </p>
          {activateError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-8 border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {activateError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-border-faint pt-2">
            <button
              type="button"
              onClick={() => setActivateTarget(null)}
              disabled={activating}
              className="rounded-8 border border-border-faint bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmActivate()}
              disabled={activating}
              className="inline-flex items-center gap-1.5 rounded-8 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {activating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : activateMode === "resume" ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {activating
                ? activateMode === "resume"
                  ? "Resuming…"
                  : "Activating…"
                : activateMode === "resume"
                  ? "Resume now"
                  : "Activate now"}
            </button>
          </div>
        </div>
      </FeatureDialog>

      <FeatureDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Delete outbound campaign"
        description="This removes the campaign and its lead from Instantly and cannot be undone."
        maxWidthClass="max-w-md"
        roundedClass="outbound-dialog outbound-confirm-dialog rounded-16"
        isSubmitting={deleting}
      >
        <div className="space-y-4">
          <div className="outbound-confirm-summary rounded-12 border border-border-faint bg-neutral-50/70 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Campaign</span>
              <span className="text-right font-semibold text-accent-black">
                {deleteTarget?.name}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Lead</span>
              <span className="font-mono text-accent-black">{deleteTarget?.leadEmail || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-500">Status</span>
              <span className="text-right font-medium text-accent-black">
                {deleteTarget?.statusLabel}
              </span>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-neutral-600">
            Deleting is permanent. If you only want to stop sending for now, use Pause instead.
          </p>
          {deleteError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-8 border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {deleteError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-border-faint pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="rounded-8 border border-border-faint bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-8 bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {deleting ? "Deleting…" : "Delete campaign"}
            </button>
          </div>
        </div>
      </FeatureDialog>

      <FeatureDialog
        open={googleOpen}
        onClose={() => {
          if (!googleSubmitting) {
            setGoogleOpen(false);
            setGooglePassword("");
          }
        }}
        title="Connect Google mailbox"
        description="Connect Gmail or Google Workspace as a sending account."
        maxWidthClass="max-w-xl"
        roundedClass="outbound-dialog outbound-mailbox-dialog rounded-16"
        isSubmitting={googleSubmitting}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitGoogleConnect();
          }}
          className="outbound-mailbox-form space-y-4"
        >
          {googleResult?.connected ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-12 border border-green-200 bg-[#E9F9EF] p-4 text-xs text-[#027A48]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">{googleResult.message}</p>
                  <p className="mt-1 font-mono text-[11px]">
                    {googleResult.account.email} · {googleResult.account.statusLabel}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-neutral-600">
                The mailbox is ready. Refresh the campaign list and create your outbound draft.
                Instantly will send from this address after activation.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setGoogleOpen(false);
                    setGoogleResult(null);
                    setGooglePassword("");
                  }}
                  className="rounded-8 bg-heat-100 px-4 py-2 text-xs font-semibold text-white hover:bg-heat-200"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {googleError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-8 border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{googleError}</span>
                </div>
              )}
              <div className="outbound-help-card rounded-12 border border-border-faint bg-neutral-50/70 p-4 text-[11px] leading-relaxed text-neutral-600 space-y-1.5">
                <div className="flex items-start gap-3">
                  <span className="outbound-help-icon">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-accent-black">Get a Google app password</p>
                    <p className="mt-1">
                      Turn on 2-Step Verification, then create an app password in your Google
                      Account security settings.
                    </p>
                  </div>
                </div>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-heat-100 underline underline-offset-2"
                >
                  Open Google app passwords
                  <ExternalLink className="h-3 w-3" />
                </a>
                <p>Paste the 16-character password below. Spaces are ignored.</p>
                <p className="text-neutral-500">
                  Google Workspace admins may disable app passwords. If the link is unavailable, ask
                  your administrator to enable them for this account.
                </p>
              </div>

              <div className="outbound-form-section grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-semibold text-accent-black sm:col-span-2">
                  Google email
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(event) => setGoogleEmail(event.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                  />
                </label>
                <label className="block space-y-1 text-xs font-semibold text-accent-black sm:col-span-2">
                  Google app password
                  <input
                    type="password"
                    value={googlePassword}
                    onChange={(event) => setGooglePassword(event.target.value)}
                    placeholder="16-character app password"
                    autoComplete="new-password"
                    spellCheck={false}
                    className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                  />
                  <span className="block text-[11px] font-normal text-neutral-500">
                    The app password is sent to Instantly to connect the mailbox. We do not store it
                    in our database.
                  </span>
                </label>
                <label className="block space-y-1 text-xs font-semibold text-accent-black">
                  First name
                  <input
                    value={googleFirstName}
                    onChange={(event) => setGoogleFirstName(event.target.value)}
                    placeholder="First name"
                    className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                  />
                </label>
                <label className="block space-y-1 text-xs font-semibold text-accent-black">
                  Last name
                  <input
                    value={googleLastName}
                    onChange={(event) => setGoogleLastName(event.target.value)}
                    placeholder="Last name"
                    className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                  />
                </label>
                <label className="block space-y-1 text-xs font-semibold text-accent-black">
                  Daily sending limit
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={googleDailyLimit}
                    onChange={(event) => setGoogleDailyLimit(event.target.value)}
                    className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:border-heat-100 focus:outline-none focus:ring-1 focus:ring-heat-100"
                  />
                </label>
                <label className="flex items-start gap-2 rounded-8 border border-border-faint bg-white p-3 text-[11px] leading-relaxed text-neutral-600 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={googleWarmup}
                    onChange={(event) => setGoogleWarmup(event.target.checked)}
                    className="mt-0.5 accent-[#FF571A]"
                  />
                  <span>
                    Enable Instantly warmup for this mailbox. Recommended for a new address; it can
                    reduce initial sending volume while reputation builds.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border-faint pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGoogleOpen(false);
                    setGooglePassword("");
                  }}
                  disabled={googleSubmitting}
                  className="rounded-8 border border-border-faint bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={googleSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-4 py-2 text-xs font-semibold text-white hover:bg-heat-200 disabled:opacity-50"
                >
                  {googleSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  {googleSubmitting ? "Connecting…" : "Connect mailbox"}
                </button>
              </div>
            </>
          )}
        </form>
      </FeatureDialog>

      <InstantlyCampaignDetailDialog
        workspaceId={workspaceId}
        campaignId={detailCampaignId}
        open={Boolean(detailCampaignId)}
        onClose={() => setDetailCampaignId(null)}
      />
    </div>
  );
}

function InstantlyCampaignDetailDialog({
  workspaceId,
  campaignId,
  open,
  onClose,
}: {
  workspaceId: string;
  campaignId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<InstantlyCampaignDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const showLoading = open && (loading || (!detail && !error));

  function refreshDetails() {
    setLoading(true);
    setError(null);
    setDetail(null);
    setRetry((value) => value + 1);
  }

  useEffect(() => {
    if (!open || !campaignId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    apiIntegrationsRepository
      .getInstantlyCampaign(workspaceId, campaignId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === "ready") setDetail(result.data);
        else setError("message" in result ? result.message : "Failed to load campaign.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId, workspaceId, retry]);

  return (
    <FeatureDialog
      open={open}
      onClose={onClose}
      title={detail?.name || "Outbound campaign"}
      description="Delivery, recipient, and email preview."
      maxWidthClass="max-w-3xl"
      roundedClass="outbound-dialog outbound-detail-dialog rounded-16"
    >
      <div className="space-y-5">
        {showLoading && (
          <div
            className="outbound-detail-skeleton space-y-4"
            role="status"
            aria-label="Loading campaign details"
          >
            <div className="h-24 rounded-12 bg-white" />
            <div className="grid grid-cols-3 gap-2.5">
              <div className="h-16 rounded-10 bg-white" />
              <div className="h-16 rounded-10 bg-white" />
              <div className="h-16 rounded-10 bg-white" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-40 rounded-12 bg-white" />
              <div className="h-40 rounded-12 bg-white" />
            </div>
            <span className="sr-only">Loading campaign details…</span>
          </div>
        )}
        {!showLoading && error && (
          <div className="outbound-detail-error rounded-12 border border-red-200 bg-red-50 p-5 text-xs text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Campaign details could not load</p>
              <p className="mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={refreshDetails}
              className="rounded-8 border border-red-200 bg-white px-3 py-1.5 font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}
        {!showLoading && detail && (
          <>
            <div className="outbound-detail-hero flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="outbound-section-kicker">Email subject</p>
                <p className="mt-1 text-base font-bold text-accent-black">
                  {detail.subject || "No subject"}
                </p>
                <p className="mt-1.5 text-xs text-neutral-500">
                  To {detail.leadEmail || "No lead"} · Created {formatDate(detail.createdAt)}
                </p>
              </div>
              <StatusPill label={detail.statusLabel} />
            </div>

            <div
              className={`outbound-send-status ${detail.sendEvent?.status === "sent" ? "is-sent" : ""}`}
            >
              <span className="outbound-send-status-icon">
                {detail.sendEvent?.status === "sent" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-accent-black">
                  {detail.sendEvent?.status === "sent"
                    ? "Sent from the connected mailbox"
                    : detail.status === 0
                      ? "Draft — not sending yet"
                      : detail.status === 2
                        ? "Paused before sending"
                        : detail.sendEvent?.status === "pending"
                          ? "Waiting for Instantly to send"
                          : "Send history is temporarily unavailable"}
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  {detail.sendEvent?.status === "sent"
                    ? `Instantly recorded this email at ${formatDateTime(detail.sendEvent.sentAt)}. Inbox placement depends on the recipient's mail provider.`
                    : detail.status === 0
                      ? "Activate this campaign when the message and recipient are ready."
                      : detail.status === 2
                        ? "Resume this campaign to continue sending."
                        : detail.sendEvent?.status === "pending"
                          ? "The campaign is active, but no sent email is recorded yet. Check the mailbox and campaign status, then refresh."
                          : "The campaign may still be sending. Refresh to check the provider's latest record."}
                </p>
              </div>
              <button
                type="button"
                onClick={refreshDetails}
                className="outbound-send-refresh"
                aria-label="Refresh send status"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="outbound-detail-stats grid grid-cols-3 gap-2.5">
              <div>
                <span>Sent</span>
                <strong>{detail.stats?.contacted ?? 0}</strong>
              </div>
              <div>
                <span>Opens</span>
                <strong>{detail.stats?.opens ?? 0}</strong>
              </div>
              <div>
                <span>Replies</span>
                <strong>{detail.stats?.replies ?? 0}</strong>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="outbound-detail-card rounded-12 border border-border-faint bg-white p-4 space-y-2 text-xs">
                <h3>Campaign</h3>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Name</span>
                  <span className="text-right font-medium text-accent-black">{detail.name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Status</span>
                  <span className="text-right font-medium text-accent-black">
                    {detail.statusLabel}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Created</span>
                  <span className="text-right font-medium text-accent-black">
                    {formatDate(detail.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Sending from</span>
                  <span className="min-w-0 break-all text-right font-medium text-accent-black">
                    {detail.accounts.join(", ") || "—"}
                  </span>
                </div>
              </div>
              <div className="outbound-detail-card rounded-12 border border-border-faint bg-white p-4 space-y-2 text-xs">
                <h3>Recipient</h3>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Lead</span>
                  <span className="text-right font-medium text-accent-black">
                    {detail.lead?.name || detail.lead?.company || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Company</span>
                  <span className="text-right font-medium text-accent-black">
                    {detail.lead?.company || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Category</span>
                  <span className="text-right font-medium text-accent-black">
                    {detail.lead?.category || "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Location</span>
                  <span className="text-right font-medium text-accent-black">
                    {detail.lead?.location || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="outbound-detail-progress rounded-12 border border-border-faint bg-white p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-accent-black">Sending progress</span>
                <span className="font-mono font-semibold text-neutral-700">
                  {detail.stats?.leads
                    ? Math.min(
                        100,
                        Math.round(((detail.stats?.contacted ?? 0) / detail.stats.leads) * 100),
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full overflow-hidden rounded-full bg-neutral-100 h-1.5">
                <div
                  className="h-1.5 rounded-full bg-heat-100 transition-all duration-300"
                  style={{
                    width: `${
                      detail.stats?.leads
                        ? Math.min(
                            100,
                            Math.round(((detail.stats?.contacted ?? 0) / detail.stats.leads) * 100),
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                <span>
                  {detail.stats?.contacted ?? 0} of {detail.stats?.leads ?? 0} leads sent
                </span>
                <span>{detail.stats?.opens ?? 0} opens</span>
                <span>{detail.stats?.replies ?? 0} replies</span>
              </div>
            </div>

            <div className="outbound-detail-links space-y-2">
              <div className="flex flex-wrap gap-2">
                {detail.links.instantly && (
                  <a
                    href={detail.links.instantly}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Instantly
                  </a>
                )}
                {detail.links.run && (
                  <Link
                    href={detail.links.run}
                    className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Lead run
                  </Link>
                )}
                {detail.links.website && (
                  <a
                    href={detail.links.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Lead website
                  </a>
                )}
                {detail.links.sources.map((source, index) => (
                  <a
                    key={source}
                    href={source}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Source {index + 1}
                  </a>
                ))}
              </div>
            </div>

            <div className="outbound-detail-email space-y-2">
              <div className="outbound-detail-email-heading">
                <div>
                  <p className="outbound-section-kicker">Message</p>
                  <h3>Email preview</h3>
                </div>
                <Mail className="h-4 w-4 text-neutral-400" />
              </div>
              {detail.body ? (
                <iframe
                  title="Outbound email content"
                  srcDoc={detail.body}
                  sandbox=""
                  className="h-[380px] w-full rounded-12 border border-border-faint bg-white"
                />
              ) : (
                <div className="rounded-12 border border-dashed border-border-faint p-10 text-center text-xs text-neutral-500">
                  No email content is available.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </FeatureDialog>
  );
}
