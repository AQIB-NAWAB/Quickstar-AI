"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { listAllRunResults, listRuns } from "@/features/lead-generation/lib/client";
import type { LeadGenerationRunSummary } from "@/features/lead-generation/lib/types";
import { FeatureDialog } from "@/features/knowledge/components/feature-dialog";
import { smtpEmailCampaignsApi } from "../lib/client";
import type {
  PersonalizedEmail,
  SmtpCampaignDetail,
  SmtpFollowUp,
  SmtpMailbox,
  SmtpRecipientInput,
} from "../lib/types";

const DEFAULT_BRIEF =
  "We help dental clinics answer every patient call with an AI receptionist that books appointments, follows up with patients, and never misses a lead. Write a short, friendly email offering a 10-minute demo and mention one specific detail about the practice.";

type BuilderStep = 1 | 2 | 3 | 4 | 5;

const STEPS: Array<{ id: BuilderStep; label: string }> = [
  { id: 1, label: "Sender" },
  { id: 2, label: "Leads" },
  { id: 3, label: "Email" },
  { id: 4, label: "Schedule" },
  { id: 5, label: "Review" },
];

type LeadOption = SmtpRecipientInput & { id: string; source: "lead_generation" | "manual" };

export function CampaignBuilderDialog({
  workspaceId,
  open,
  onClose,
  mailboxes,
  onCreated,
}: {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  mailboxes: SmtpMailbox[];
  onCreated: (campaign: SmtpCampaignDetail) => void;
}) {
  const [step, setStep] = useState<BuilderStep>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — sender
  const [mailboxId, setMailboxId] = useState("");
  const [fromName, setFromName] = useState("");

  // Step 2 — leads
  const [runs, setRuns] = useState<LeadGenerationRunSummary[]>([]);
  const [runId, setRunId] = useState("");
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingRunLeads, setLoadingRunLeads] = useState(false);
  const [runLeads, setRunLeads] = useState<LeadOption[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<LeadOption[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Step 3 — email
  const [mode, setMode] = useState<"generic" | "personalized">("personalized");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [html, setHtml] = useState("");
  const [brief, setBrief] = useState(DEFAULT_BRIEF);
  const [sample, setSample] = useState<PersonalizedEmail | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);

  // Step 4 — schedule
  const [sendNow, setSendNow] = useState(true);
  const [sendAt, setSendAt] = useState("");
  const [followUps, setFollowUps] = useState<SmtpFollowUp[]>([]);

  // Step 5 — review
  const [consent, setConsent] = useState(false);

  const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const selectedCount = useMemo(
    () => new Set(selectedLeads.map((lead) => lead.email.toLowerCase())).size,
    [selectedLeads],
  );

  function reset() {
    setStep(1);
    setError(null);
    setSubmitting(false);
    setMailboxId("");
    setFromName("");
    setRunId("");
    setRunLeads([]);
    setSelectedLeads([]);
    setManualOpen(false);
    setManualEmail("");
    setManualName("");
    setManualCompany("");
    setManualCategory("");
    setManualLocation("");
    setManualNotes("");
    setMode("personalized");
    setSubject("");
    setPreviewText("");
    setHtml("");
    setBrief(DEFAULT_BRIEF);
    setSample(null);
    setSampleLoading(false);
    setSendNow(true);
    setSendAt("");
    setFollowUps([]);
    setConsent(false);
  }

  function close() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function loadRuns() {
    if (runs.length > 0) return;
    setLoadingRuns(true);
    const result = await listRuns(workspaceId);
    if (result.data?.items) setRuns(result.data.items);
    setLoadingRuns(false);
  }

  async function loadRunLeads(nextRunId: string) {
    setRunId(nextRunId);
    setRunLeads([]);
    if (!nextRunId) return;
    setLoadingRunLeads(true);
    setError(null);
    const result = await listAllRunResults(workspaceId, nextRunId);
    if (result.error || !result.data) {
      setError(result.error?.message ?? "Failed to load lead generation results.");
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
          name: assessment.company_name ? "" : undefined,
          company: assessment.company_name,
          website: assessment.website,
          category: assessment.category,
          location: assessment.location ?? "",
          summary: assessment.summary,
          lead: {
            fitReasons: assessment.fit_reasons,
            evidence: assessment.evidence,
            runId: nextRunId,
          },
          source: "lead_generation" as const,
        };
      });
    setRunLeads(leads);
    setLoadingRunLeads(false);
  }

  function toggleLead(lead: LeadOption) {
    setSelectedLeads((current) =>
      current.some((item) => item.email.toLowerCase() === lead.email.toLowerCase())
        ? current.filter((item) => item.email.toLowerCase() !== lead.email.toLowerCase())
        : [...current, lead],
    );
  }

  function addManualLead() {
    setError(null);
    const email = manualEmail.trim().toLowerCase();
    if (!validEmail(email)) {
      setError("Enter a valid email for the manual lead.");
      return;
    }
    const lead: LeadOption = {
      id: `manual-${email}`,
      email,
      name: manualName.trim() || undefined,
      company: manualCompany.trim() || undefined,
      category: manualCategory.trim() || undefined,
      location: manualLocation.trim() || undefined,
      notes: manualNotes.trim() || undefined,
      source: "manual",
    };
    setSelectedLeads((current) =>
      current.some((item) => item.email.toLowerCase() === email)
        ? current.map((item) => (item.email.toLowerCase() === email ? lead : item))
        : [...current, lead],
    );
    setManualEmail("");
    setManualName("");
    setManualCompany("");
    setManualCategory("");
    setManualLocation("");
    setManualNotes("");
    setManualOpen(false);
  }

  function removeLead(email: string) {
    setSelectedLeads((current) =>
      current.filter((item) => item.email.toLowerCase() !== email.toLowerCase()),
    );
  }

  async function generateSample() {
    const first = selectedLeads[0];
    if (!first || !brief.trim() || !fromName.trim()) {
      setError("Select at least one lead and add a brief and sender name first.");
      return;
    }
    setSampleLoading(true);
    setSample(null);
    setError(null);
    const result = await smtpEmailCampaignsApi.generateSample(workspaceId, {
      lead: first,
      brief: brief.trim(),
      fromName: fromName.trim(),
    });
    setSampleLoading(false);
    if (result.status !== "ready") {
      setError("message" in result ? result.message : "Failed to generate the sample.");
      return;
    }
    setSample(result.data);
  }

  function addFollowUp() {
    setFollowUps((current) => [
      ...current,
      { delayDays: 3, mode: mode === "personalized" ? "personalized" : "generic", subject: "", html: "", brief: "" },
    ]);
  }

  function updateFollowUp(index: number, patch: Partial<SmtpFollowUp>) {
    setFollowUps((current) =>
      current.map((followUp, i) => (i === index ? { ...followUp, ...patch } : followUp)),
    );
  }

  function removeFollowUp(index: number) {
    setFollowUps((current) => current.filter((_, i) => i !== index));
  }

  function stepLabel(index: number): string {
    const item = STEPS[index];
    return item ? item.label : "";
  }

  function canContinue(): boolean {
    if (step === 1) return Boolean(mailboxId && fromName.trim());
    if (step === 2) return selectedLeads.length > 0;
    if (step === 3) {
      if (mode === "generic") return Boolean(subject.trim() && html.trim());
      return Boolean(brief.trim());
    }
    if (step === 4) return sendNow || Boolean(sendAt);
    return true;
  }

  function next() {
    setError(null);
    if (step === 1) {
      if (!mailboxId) {
        setError("Choose a sending mailbox.");
        return;
      }
      if (!fromName.trim()) {
        setError("Add the sender name that recipients will see.");
        return;
      }
    }
    if (step === 2 && selectedLeads.length === 0) {
      setError("Select at least one lead or add one manually.");
      return;
    }
    if (step === 3) {
      if (mode === "generic" && (!subject.trim() || !html.trim())) {
        setError("Add a subject and body for the shared email.");
        return;
      }
      if (mode === "personalized" && !brief.trim()) {
        setError("Add a campaign brief the AI can personalize from.");
        return;
      }
    }
    if (step === 4) {
      if (!sendNow && !sendAt) {
        setError("Choose a send time or switch back to “Send now”.");
        return;
      }
    }
    setStep((Math.min(step + 1, 5)) as BuilderStep);
  }

  async function createAndActivate() {
    if (!consent) {
      setError("Confirm that the recipients consented to receive email.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const recipients: SmtpRecipientInput[] = selectedLeads.map((lead) => ({
      email: lead.email,
      name: lead.name,
      company: lead.company,
      website: lead.website,
      category: lead.category,
      location: lead.location,
      summary: lead.summary,
      notes: lead.notes,
      lead: lead.lead,
    }));

    const schedule = {
      sendAt: sendNow ? undefined : sendAt,
      followUps: followUps.filter((followUp) =>
        followUp.mode === "personalized"
          ? Boolean(followUp.brief?.trim())
          : Boolean(followUp.subject?.trim() && followUp.html?.trim()),
      ),
    };

    const created = await smtpEmailCampaignsApi.createCampaign(workspaceId, {
      name: `${mode === "personalized" ? "AI personalized" : "Shared"} — ${selectedLeads.length} lead${selectedLeads.length === 1 ? "" : "s"}`,
      mailboxId,
      mode,
      fromName: fromName.trim(),
      subject: mode === "generic" ? subject.trim() : undefined,
      previewText: previewText.trim() || undefined,
      html: mode === "generic" ? html.trim() : undefined,
      brief: mode === "personalized" ? brief.trim() : undefined,
      recipients,
      schedule,
      consentConfirmed: true,
    });
    if (created.status !== "ready") {
      setSubmitting(false);
      setError("message" in created ? created.message : "Failed to create the campaign.");
      return;
    }

    const activated = await smtpEmailCampaignsApi.activateCampaign(workspaceId, created.data.id);
    setSubmitting(false);
    if (activated.status !== "ready") {
      setError(
        "message" in activated
          ? `Campaign draft created, but activation failed: ${activated.message}`
          : "Campaign draft created, but activation failed.",
      );
      onCreated(created.data);
      return;
    }
    reset();
    onCreated(activated.data);
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <FeatureDialog
      open={open}
      onClose={close}
      title="New email campaign"
      description="Connect a sender, pick leads, write the email, schedule it, then activate."
      maxWidthClass="max-w-4xl"
      isSubmitting={submitting}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border-faint px-6 pt-4">
          <div role="tablist" aria-label="Campaign builder steps" className="flex gap-1">
            {STEPS.map((item, index) => {
              const active = step === item.id;
              const complete = index < stepIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (index < stepIndex) {
                      setError(null);
                      setStep(item.id);
                    }
                  }}
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
                    {complete ? <CheckCircle2 className="h-3 w-3" /> : item.id}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{stepLabel(index)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-8 border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-accent-black">Sending mailbox</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-semibold text-accent-black">
                  Mailbox
                  <select
                    value={mailboxId}
                    onChange={(event) => setMailboxId(event.target.value)}
                    className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                  >
                    <option value="">Choose a connected mailbox</option>
                    {mailboxes.map((mailbox) => (
                      <option key={mailbox.id} value={mailbox.id}>
                        {mailbox.email}
                        {mailbox.sentDate ? ` · ${mailbox.sentToday}/${mailbox.dailyLimit} today` : ""}
                      </option>
                    ))}
                  </select>
                  {mailboxes.length === 0 && (
                    <span className="block text-[11px] font-normal text-neutral-500">
                      No mailboxes yet. Close this dialog and use “Connect mailbox” on the
                      campaigns page.
                    </span>
                  )}
                </label>
                <label className="block space-y-1 text-xs font-semibold text-accent-black">
                  Sender name
                  <input
                    value={fromName}
                    onChange={(event) => setFromName(event.target.value)}
                    maxLength={120}
                    placeholder="Jane from QuickStart AI"
                    className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                  />
                </label>
              </div>
              <p className="rounded-8 border border-border-faint bg-neutral-50 p-3 text-[11px] leading-relaxed text-neutral-500">
                Gmail sends from the connected mailbox’s own address and shows the sender
                name you choose. Replies go to the mailbox address.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-accent-black">Leads</h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-heat-100">
                    {selectedCount} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualOpen((value) => !value)}
                    className="inline-flex items-center gap-1 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add manual lead
                  </button>
                </div>
              </div>

              {manualOpen && (
                <div className="rounded-12 border border-border-faint bg-neutral-50/70 p-4 grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-xs font-semibold text-accent-black">
                    Email
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={(event) => setManualEmail(event.target.value)}
                      placeholder="lead@example.com"
                      className="w-full rounded-8 border border-neutral-200 bg-white px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-accent-black">
                    Contact name
                    <input
                      value={manualName}
                      onChange={(event) => setManualName(event.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-8 border border-neutral-200 bg-white px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-accent-black">
                    Company
                    <input
                      value={manualCompany}
                      onChange={(event) => setManualCompany(event.target.value)}
                      placeholder="Dental practice"
                      className="w-full rounded-8 border border-neutral-200 bg-white px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-accent-black">
                    Category
                    <input
                      value={manualCategory}
                      onChange={(event) => setManualCategory(event.target.value)}
                      placeholder="Dental clinic"
                      className="w-full rounded-8 border border-neutral-200 bg-white px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-accent-black">
                    Location
                    <input
                      value={manualLocation}
                      onChange={(event) => setManualLocation(event.target.value)}
                      placeholder="City or region"
                      className="w-full rounded-8 border border-neutral-200 bg-white px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-accent-black sm:col-span-2">
                    Notes / context
                    <textarea
                      value={manualNotes}
                      onChange={(event) => setManualNotes(event.target.value)}
                      rows={2}
                      placeholder="Anything the AI should use."
                      className="w-full resize-y rounded-8 border border-neutral-200 bg-white px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                  </label>
                  <div className="sm:col-span-2 flex items-center justify-end">
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

              <div className="space-y-1">
                <span className="text-xs font-semibold text-accent-black">
                  Load from a lead generation run
                </span>
                <div className="flex gap-2">
                  <select
                    value={runId}
                    onChange={(event) => void loadRunLeads(event.target.value)}
                    onFocus={() => void loadRuns()}
                    disabled={loadingRuns}
                    className="min-w-0 flex-1 rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100"
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
                </div>
              </div>

              {loadingRunLeads && (
                <div className="flex items-center gap-2 py-6 text-xs text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin text-heat-100" />
                  Loading accepted leads…
                </div>
              )}

              {runLeads.length > 0 && (
                <div className="rounded-12 border border-border-faint overflow-hidden">
                  <div className="max-h-64 overflow-y-auto divide-y divide-border-faint">
                    {runLeads.map((lead) => {
                      const selected = selectedLeads.some(
                        (item) => item.email.toLowerCase() === lead.email.toLowerCase(),
                      );
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => toggleLead(lead)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            selected ? "bg-orange-50/60" : "hover:bg-neutral-50"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-4 border ${
                              selected
                                ? "border-heat-100 bg-heat-100 text-white"
                                : "border-neutral-300 bg-white"
                            }`}
                          >
                            {selected && <CheckCircle2 className="h-3 w-3" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-xs text-accent-black">
                              {lead.company || lead.email}
                            </strong>
                            <small className="block truncate text-[11px] text-neutral-500">
                              {lead.email}
                              {lead.location ? ` · ${lead.location}` : ""}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedLeads.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-accent-black">Selected leads</h3>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-heat-100">
                      {selectedLeads.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border-faint rounded-12 border border-border-faint">
                    {selectedLeads.map((lead) => (
                      <div key={lead.id} className="flex items-center gap-3 px-4 py-2">
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-xs text-accent-black">
                            {lead.company || lead.name || lead.email}
                          </strong>
                          <small className="block truncate text-[11px] text-neutral-500">
                            {lead.email} · {lead.source === "manual" ? "Manual" : "Lead run"}
                          </small>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLead(lead.email)}
                          aria-label={`Remove ${lead.email}`}
                          className="rounded-6 p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div
                role="tablist"
                aria-label="Email mode"
                className="inline-flex items-center rounded-10 border border-border-faint bg-neutral-50 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "personalized"}
                  onClick={() => {
                    setMode("personalized");
                    setSample(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-8 px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    mode === "personalized"
                      ? "bg-white text-accent-black shadow-xs"
                      : "text-neutral-500 hover:text-accent-black"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-heat-100" />
                  AI personalized
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "generic"}
                  onClick={() => setMode("generic")}
                  className={`inline-flex items-center gap-1.5 rounded-8 px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    mode === "generic"
                      ? "bg-white text-accent-black shadow-xs"
                      : "text-neutral-500 hover:text-accent-black"
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Shared email
                </button>
              </div>

              {mode === "generic" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-xs font-semibold text-accent-black">
                    Subject
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      maxLength={150}
                      className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-accent-black">
                    Preview text
                    <input
                      value={previewText}
                      onChange={(event) => setPreviewText(event.target.value)}
                      maxLength={150}
                      placeholder="Optional"
                      className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-accent-black sm:col-span-2">
                    Body
                    <span className="ml-1 text-[11px] font-normal text-neutral-500">
                      HTML or plain text
                    </span>
                    <textarea
                      value={html}
                      onChange={(event) => setHtml(event.target.value)}
                      rows={10}
                      className="w-full resize-y rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block space-y-1 text-xs font-semibold text-accent-black">
                    Campaign brief
                    <textarea
                      value={brief}
                      onChange={(event) => setBrief(event.target.value)}
                      rows={4}
                      className="w-full resize-y rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                    />
                    <span className="block text-[11px] font-normal text-neutral-500">
                      The AI writes a unique subject and body for every lead using this brief
                      and the lead’s research details.
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void generateSample()}
                      disabled={sampleLoading || selectedLeads.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      {sampleLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-heat-100" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      {sampleLoading ? "Generating sample…" : "Generate sample preview"}
                    </button>
                    <span className="text-[11px] text-neutral-500">
                      Uses the first selected lead. Every lead is personalized automatically
                      after activation.
                    </span>
                  </div>

                  {sample && (
                    <div className="rounded-12 border border-border-faint bg-white p-4 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-accent-black">{sample.subject}</p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-heat-100">
                          <Sparkles className="h-3 w-3" />
                          {sample.source === "ai" ? "AI personalized" : "Template fallback"}
                        </span>
                      </div>
                      <iframe
                        title="Sample email preview"
                        srcDoc={sample.html}
                        sandbox=""
                        className="h-64 w-full rounded-8 border border-border-faint bg-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-accent-black">Schedule</h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded-8 border border-border-faint bg-white p-3 text-xs font-semibold text-accent-black">
                  <input
                    type="radio"
                    checked={sendNow}
                    onChange={() => setSendNow(true)}
                    className="mt-0.5 accent-[#FF571A]"
                  />
                  Send now
                </label>
                <label className="flex items-start gap-2 rounded-8 border border-border-faint bg-white p-3 text-xs font-semibold text-accent-black">
                  <input
                    type="radio"
                    checked={!sendNow}
                    onChange={() => setSendNow(false)}
                    className="mt-0.5 accent-[#FF571A]"
                  />
                  <span className="flex flex-col gap-1">
                    Schedule for later
                    <input
                      type="datetime-local"
                      value={sendAt}
                      min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                      onChange={(event) => setSendAt(event.target.value)}
                      disabled={sendNow}
                      className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100 disabled:opacity-50"
                    />
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-accent-black">Follow-ups</h3>
                  <button
                    type="button"
                    onClick={addFollowUp}
                    disabled={followUps.length >= 6}
                    className="inline-flex items-center gap-1 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add follow-up
                  </button>
                </div>
                {followUps.length === 0 ? (
                  <p className="rounded-8 border border-dashed border-border-faint p-4 text-center text-[11px] text-neutral-500">
                    No follow-ups. Each recipient gets one email only.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {followUps.map((followUp, index) => (
                      <div
                        key={index}
                        className="rounded-12 border border-border-faint bg-white p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Follow-up {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFollowUp(index)}
                            className="rounded-6 p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove follow-up ${index + 1}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block space-y-1 text-xs font-semibold text-accent-black">
                            Delay (days after previous email)
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={followUp.delayDays}
                              onChange={(event) =>
                                updateFollowUp(index, {
                                  delayDays: Math.min(60, Math.max(1, Number(event.target.value) || 1)),
                                })
                              }
                              className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                            />
                          </label>
                          <label className="block space-y-1 text-xs font-semibold text-accent-black">
                            Content mode
                            <select
                              value={followUp.mode ?? "generic"}
                              onChange={(event) =>
                                updateFollowUp(index, {
                                  mode: event.target.value === "personalized" ? "personalized" : "generic",
                                })
                              }
                              className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                            >
                              <option value="generic">Shared template</option>
                              <option value="personalized">AI personalized</option>
                            </select>
                          </label>
                          {followUp.mode === "personalized" ? (
                            <label className="block space-y-1 text-xs font-semibold text-accent-black sm:col-span-2">
                              Follow-up brief
                              <textarea
                                value={followUp.brief ?? ""}
                                onChange={(event) => updateFollowUp(index, { brief: event.target.value })}
                                rows={3}
                                placeholder="E.g. a short, friendly nudge referencing the first email."
                                className="w-full resize-y rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                              />
                            </label>
                          ) : (
                            <>
                              <label className="block space-y-1 text-xs font-semibold text-accent-black">
                                Subject
                                <input
                                  value={followUp.subject ?? ""}
                                  onChange={(event) => updateFollowUp(index, { subject: event.target.value })}
                                  maxLength={150}
                                  className="w-full rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                                />
                              </label>
                              <label className="block space-y-1 text-xs font-semibold text-accent-black sm:col-span-2">
                                Body
                                <textarea
                                  value={followUp.html ?? ""}
                                  onChange={(event) => updateFollowUp(index, { html: event.target.value })}
                                  rows={4}
                                  className="w-full resize-y rounded-8 border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs font-normal text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100"
                                />
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-accent-black">Review and activate</h3>
              <div className="rounded-12 border border-border-faint bg-neutral-50/70 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Mailbox</span>
                  <span className="font-medium text-accent-black truncate">
                    {mailboxes.find((mailbox) => mailbox.id === mailboxId)?.email || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Sender name</span>
                  <span className="font-medium text-accent-black">{fromName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Email mode</span>
                  <span className="font-medium text-accent-black">
                    {mode === "personalized" ? "AI personalized" : "Shared email"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Recipients</span>
                  <span className="font-mono font-semibold text-accent-black">{selectedCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Send time</span>
                  <span className="font-medium text-accent-black">
                    {sendNow ? "Immediately after activation" : new Date(sendAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Follow-ups</span>
                  <span className="font-medium text-accent-black">
                    {followUps.length === 0 ? "None" : `${followUps.length} follow-up${followUps.length === 1 ? "" : "s"}`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                After activation the recipient list is fixed and cannot be changed. Sending
                uses the mailbox’s Google app password over SMTP only — no open, click, or
                reply tracking — and every email includes a one-click unsubscribe link.
              </p>

              <label className="flex items-start gap-2 rounded-8 border border-border-faint bg-white p-3 text-[11px] leading-relaxed text-neutral-600">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-0.5 accent-[#FF571A]"
                />
                <span>
                  I confirm these contacts consented to receive marketing email. I understand
                  sending starts automatically and the recipient list becomes fixed.
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border-faint px-6 py-3">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep((Math.max(1, step - 1)) as BuilderStep);
            }}
            disabled={step <= 1 || submitting}
            className="inline-flex items-center gap-1.5 rounded-8 border border-border-faint bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canContinue()}
              className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-3 py-1.5 text-xs font-semibold text-white hover:bg-heat-200 disabled:opacity-50"
            >
              Continue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void createAndActivate()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-8 bg-heat-100 px-4 py-1.5 text-xs font-semibold text-white hover:bg-heat-200 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {submitting ? "Creating & activating…" : "Create & activate"}
            </button>
          )}
        </div>
      </div>
    </FeatureDialog>
  );
}
