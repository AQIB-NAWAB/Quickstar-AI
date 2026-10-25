"use client";

import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  HelpCircle,
  History,
  Mail,
  Phone,
  PhoneCall,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { updateLeadSalesStatus, getLeadObservations } from "../lib/client";
import type {
  LeadGenerationCandidateResult,
  LeadRunInput,
  SalesStatus,
  LeadObservation,
} from "../lib/types";
import {
  cleanDomain,
  ensureAbsoluteUrl,
  formatFieldLabel,
  formatFitScore,
  formatStatusLabel,
} from "../lib/format";

interface LeadDetailDrawerProps {
  candidate: LeadGenerationCandidateResult;
  brief?: LeadRunInput;
  workspaceId?: string;
  onClose: () => void;
}

export function LeadDetailDrawer({
  candidate,
  brief,
  workspaceId,
  onClose,
}: LeadDetailDrawerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const lead = candidate.assessment;
  const drawerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Outreach Modals State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  // Email form state
  const [emailRecipient, setEmailRecipient] = useState(
    lead?.email || lead?.decision_maker?.email || ""
  );
  const [emailSubject, setEmailSubject] = useState(
    lead?.company_name
      ? `Introduction: Partnership opportunity for ${lead.company_name}`
      : "Partnership inquiry"
  );
  const [emailBody, setEmailBody] = useState(
    `Hi ${lead?.person_name || "there"},\n\nI came across ${lead?.company_name || "your organization"} and noticed your work in ${lead?.category || "the industry"}.\n\nWould you be open to a brief conversation this week?\n\nBest regards,\n[Your Name]`
  );
  const [emailSending, setEmailSending] = useState(false);
  const [emailOutcome, setEmailOutcome] = useState<{
    ok: boolean;
    status: string;
    message: string;
  } | null>(null);

  // Phone call form state
  const [phoneRecipient, setPhoneRecipient] = useState(
    lead?.phone || lead?.decision_maker?.phone || ""
  );
  const [humanTransferDestination, setHumanTransferDestination] = useState("+1-800-555-0199");
  const [explicitPhoneConsent, setExplicitPhoneConsent] = useState(false);
  const [phoneCalling, setPhoneCalling] = useState(false);
  const [phoneOutcome, setPhoneOutcome] = useState<{
    ok: boolean;
    status: string;
    message: string;
  } | null>(null);

  // Sales Status, Notes, and History state
  const leadId = (candidate as any).lead_id || (lead as any)?.lead_id || (candidate.status === "accepted" ? candidate.id : null);
  const [salesStatus, setSalesStatus] = useState<SalesStatus>(
    (candidate as any).sales_status || (lead as any)?.sales_status || "new"
  );
  const [notes, setNotes] = useState<string>(
    (candidate as any).notes || (lead as any)?.notes || ""
  );
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [observations, setObservations] = useState<LeadObservation[]>([]);
  const [loadingObservations, setLoadingObservations] = useState(false);

  const refreshHistory = (candidate as any).refresh_history || (lead as any)?.refresh_history || [];
  const activityHistory = (candidate as any).activity_history || (lead as any)?.activity_history || [];

  useEffect(() => {
    if (!leadId || !workspaceId) return;
    let active = true;
    void (async () => {
      setLoadingObservations(true);
      const res = await getLeadObservations(workspaceId, leadId);
      if (active && res.data?.items) {
        setObservations(res.data.items);
      }
      if (active) setLoadingObservations(false);
    })();
    return () => {
      active = false;
    };
  }, [leadId, workspaceId]);

  async function handleStatusChange(newStatus: SalesStatus) {
    if (!leadId || !workspaceId || updatingStatus) return;
    setUpdatingStatus(true);
    setSalesStatus(newStatus);
    await updateLeadSalesStatus(workspaceId, leadId, { status: newStatus });
    setUpdatingStatus(false);
  }

  async function handleSaveNotes() {
    if (!leadId || !workspaceId || savingNotes) return;
    setSavingNotes(true);
    await updateLeadSalesStatus(workspaceId, leadId, { notes });
    setSavingNotes(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  // Unified close handler with graceful exit animation
  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  }, [closing, onClose]);

  // Accessibility: store trigger focus, lock scroll, trap focus, and handle Escape
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (emailModalOpen) {
          setEmailModalOpen(false);
          return;
        }
        if (phoneModalOpen) {
          setPhoneModalOpen(false);
          return;
        }
        e.preventDefault();
        handleClose();
      } else if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActiveElement.current?.focus();
    };
  }, [handleClose, emailModalOpen, phoneModalOpen]);

  function copyToClipboard(text: string, fieldName: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  // Handle Send Email Outreach
  async function handleSendEmail() {
    setEmailSending(true);
    setEmailOutcome(null);

    // Simulate calling the email boundary adapter
    setTimeout(() => {
      setEmailSending(false);
      setEmailOutcome({
        ok: true,
        status: "adapter_draft_recorded",
        message:
          "Email draft recorded at boundary adapter. External email automation engine is not connected in this demo workspace. Simulated sends are never represented as live dispatches.",
      });
    }, 600);
  }

  // Handle Initiate AI Phone Call
  async function handleInitiateCall() {
    if (!explicitPhoneConsent) return;
    setPhoneCalling(true);
    setPhoneOutcome(null);

    setTimeout(() => {
      setPhoneCalling(false);
      setPhoneOutcome({
        ok: false,
        status: "telephony_not_connected",
        message:
          "AI Telephony connection requires CPaaS credentials (Twilio or SIP trunk) configured in workspace settings. Call not dispatched in demo mode. Human transfer destination recorded: " +
          humanTransferDestination,
      });
    }, 700);
  }

  const isAccepted = candidate.status === "accepted";
  const isRejected = candidate.status === "rejected";
  const hasFitScore = lead?.fit_score !== undefined && lead.fit_score !== null;

  // Deriving banner messages based strictly on actual data and brief criteria
  let bannerTitle = "Qualification assessment completed";
  let bannerSubtitle = "";

  if (isAccepted) {
    bannerTitle = "Prospect qualified against target criteria";
    bannerSubtitle = "Verified public information matches requirements.";
  } else if (brief?.required_contact === "email" && !lead?.email) {
    bannerTitle = "Required email was not found";
    bannerSubtitle = "The website did not list a direct public email address.";
  } else if (brief?.required_contact === "phone" && !lead?.phone) {
    bannerTitle = "Required phone was not found";
    bannerSubtitle = "The website did not list a verified direct phone number.";
  } else if (brief?.location && !lead?.location) {
    bannerTitle = "Target location was not matched";
    bannerSubtitle = "Could not confirm business location aligns with target area.";
  } else if (candidate.status === "failed") {
    bannerTitle = "Research Failed";
    bannerSubtitle =
      lead?.explanation ||
      lead?.fit_reasons?.[0] ||
      (lead?.technical_error ? `Technical error: ${lead.technical_error}` : "Website could not be reached or timed out.");
  } else if (candidate.status === "duplicate") {
    bannerTitle = "Duplicate Candidate";
    bannerSubtitle =
      lead?.explanation ||
      lead?.fit_reasons?.[0] ||
      "This prospect was already discovered or recorded in this workspace.";
  } else if (isRejected) {
    bannerTitle = "Candidate does not meet qualification criteria";
    bannerSubtitle =
      lead?.fit_reasons?.[0] || "Research indicated insufficient fit with target criteria.";
  } else {
    bannerTitle = `Candidate ${formatStatusLabel(candidate.status)}`;
    bannerSubtitle = lead?.fit_reasons?.[0] || "";
  }

  // If a secondary reason is available, show it as subtitle
  if (lead?.fit_reasons && lead.fit_reasons.length > 0) {
    const secondary = lead.fit_reasons.find((r) => {
      const lower = r.toLowerCase();
      return (
        lower.includes("role") ||
        lower.includes("size") ||
        lower.includes("contact") ||
        lower.includes("location")
      );
    });
    if (secondary && secondary !== bannerSubtitle) {
      bannerSubtitle = secondary;
    }
  }

  const businessDisplayName =
    lead?.company_name?.trim() || cleanDomain(lead?.website) || "Unnamed candidate";

  // Decision maker details
  const decisionMakerName = lead?.person_name || lead?.decision_maker?.name || null;
  const decisionMakerRole = lead?.person_role || lead?.decision_maker?.role || null;
  const decisionMakerEmail = lead?.decision_maker?.email || lead?.email || null;
  const decisionMakerPhone = lead?.decision_maker?.phone || lead?.phone || null;

  // 4 Dimensions
  const dimBusiness = lead?.dimensions?.business_fit;
  const dimEvidence = lead?.dimensions?.evidence_completeness;
  const dimContact = lead?.dimensions?.contact_readiness;
  const dimOutreach = lead?.dimensions?.outreach_eligibility;

  return (
    <>
      {/* Light translucent backdrop */}
      <div
        className={`fixed inset-0 !m-0 !mt-0 z-40 bg-neutral-900/30 transition-opacity duration-200 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Inspector Panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-business-title"
        className={`fixed inset-y-0 right-0 !m-0 !mt-0 z-50 flex w-full max-w-full flex-col border-l border-neutral-200 bg-white shadow-2xl sm:w-[560px] md:w-[700px] lg:w-[820px] xl:w-[900px] ${
          closing ? "animate-drawer-out" : "animate-drawer-in"
        }`}
      >
        {/* Fixed Header */}
        <div className="border-b border-neutral-200 px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Lead Dossier & Evidence
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
              aria-label="Close details"
              title="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2
                id="drawer-business-title"
                className="text-2xl font-bold tracking-tight text-neutral-900 break-words"
              >
                {businessDisplayName}
              </h2>
              {lead?.category && (
                <p className="text-xs text-neutral-500 font-medium">{lead.category}</p>
              )}
            </div>

            {/* Candidate status & mode badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {lead?.qualification_mode && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    lead.qualification_mode === "strict"
                      ? "bg-purple-50 text-purple-800 border border-purple-200"
                      : "bg-blue-50 text-blue-800 border border-blue-200"
                  }`}
                >
                  {lead.qualification_mode === "strict" ? "Strict Evaluation" : "Best Match"}
                </span>
              )}

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isAccepted
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : isRejected
                    ? "bg-orange-50 text-orange-800 border border-orange-200"
                    : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isAccepted
                      ? "bg-emerald-600"
                      : isRejected
                      ? "bg-orange-600"
                      : "bg-neutral-400"
                  }`}
                />
                {formatStatusLabel(candidate.status)}
              </span>
            </div>
          </div>

          {/* Action Ribbon: Outreach Actions */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-neutral-500 font-medium">
              Direct outreach requires explicit human authorization.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmailModalOpen(true);
                  setEmailOutcome(null);
                }}
                disabled={!decisionMakerEmail}
                className="inline-flex items-center gap-1.5 rounded-8 border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 transition-colors shadow-xs"
                title={decisionMakerEmail ? "Draft email outreach" : "No email available for this lead"}
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Email Lead</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhoneModalOpen(true);
                  setPhoneOutcome(null);
                }}
                disabled={!decisionMakerPhone}
                className="inline-flex items-center gap-1.5 rounded-8 border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 transition-colors shadow-xs"
                title={decisionMakerPhone ? "Initiate AI phone call" : "No phone available for this lead"}
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>AI Voice Call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7 space-y-6">
          {/* Assessment Summary Strip */}
          <div
            className={`flex items-start justify-between gap-4 rounded-md border p-4 border-l-4 ${
              isAccepted
                ? "bg-emerald-50/40 border-emerald-200/80 border-l-emerald-600"
                : "bg-orange-50/40 border-orange-200/80 border-l-orange-500"
            }`}
          >
            <div className="min-w-0 pr-2">
              <p className="text-sm font-bold text-neutral-900">{bannerTitle}</p>
              {bannerSubtitle && (
                <p className="mt-0.5 text-xs text-neutral-600 leading-relaxed">
                  {bannerSubtitle}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-bold text-neutral-900 leading-none">
                {hasFitScore ? formatFitScore(lead?.fit_score) : "—"}
              </p>
              <p className="mt-1 text-xs text-neutral-400">Fit score</p>
            </div>
          </div>

          {/* Sales Pipeline & Status Management Card */}
          <div className="rounded-8 border border-neutral-200 bg-white p-4 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-heat-100" />
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Sales Pipeline Status
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={salesStatus}
                  onChange={(e) => void handleStatusChange(e.target.value as SalesStatus)}
                  disabled={!leadId || updatingStatus}
                  className="h-8 px-2.5 rounded-6 border border-neutral-300 bg-white text-xs font-semibold text-neutral-900 focus:outline-none focus:border-heat-100 cursor-pointer disabled:opacity-50"
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="replied">Replied</option>
                  <option value="meeting">Meeting Scheduled</option>
                  <option value="won">Closed Won</option>
                  <option value="lost">Closed Lost</option>
                </select>
                {updatingStatus && <span className="text-[11px] text-neutral-400 animate-pulse">Saving…</span>}
              </div>
            </div>

            {/* User Notes */}
            <div className="space-y-1.5 pt-1 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Lead Notes</span>
                </label>
                {notesSaved && (
                  <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private sales notes, follow-up dates, or context..."
                className="w-full p-2.5 border border-neutral-300 rounded-6 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-heat-100"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!leadId || savingNotes}
                  onClick={() => void handleSaveNotes()}
                  className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-6 text-xs font-semibold transition-colors"
                >
                  {savingNotes ? "Saving…" : "Save Notes"}
                </button>
              </div>
            </div>
          </div>

          {/* History Timelines (Refresh History & Activity History) */}
          {(refreshHistory.length > 0 || activityHistory.length > 0) && (
            <div className="rounded-8 border border-neutral-200 bg-neutral-50/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  Lead History & Rediscovery Timelines
                </span>
              </div>

              {refreshHistory.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Refresh History ({refreshHistory.length})
                  </span>
                  <div className="space-y-2">
                    {refreshHistory.map((rh: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-6 bg-white border border-neutral-200 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-neutral-900">
                            Run #{rh.run_id?.slice(0, 8)}
                          </span>
                          <span className="text-neutral-400">
                            {rh.refreshed_at ? new Date(rh.refreshed_at).toLocaleString() : ""}
                          </span>
                        </div>
                        {rh.fit_score !== undefined && rh.fit_score !== null && (
                          <div className="text-[11px] text-neutral-600">
                            Fit score evaluated at: <strong>{rh.fit_score}/100</strong>
                          </div>
                        )}
                        {rh.new_summary && (
                          <p className="text-[11px] text-neutral-700 italic">
                            "{rh.new_summary}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activityHistory.length > 0 && (
                <div className="space-y-1.5 text-xs pt-2 border-t border-neutral-200/60">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Sales Activity Log
                  </span>
                  <div className="space-y-1">
                    {activityHistory.map((act: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-neutral-100 last:border-none">
                        <span className="font-medium text-neutral-800 capitalize">
                          {act.action?.replace(/_/g, " ")}: {act.details?.to || act.details?.from || ""}
                        </span>
                        <span className="text-neutral-400">
                          {act.timestamp ? new Date(act.timestamp).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Named Decision-Maker Card */}
          {decisionMakerName && (
            <div className="rounded-8 border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Named Decision-Maker
                  </span>
                </div>
                <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  Extracted Prospect
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Full Name</span>
                  <span className="font-bold text-neutral-900 text-sm">{decisionMakerName}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Role / Title</span>
                  <span className="font-semibold text-neutral-800">
                    {decisionMakerRole || "Executive"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Direct Email</span>
                  {decisionMakerEmail ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <a
                        href={`mailto:${decisionMakerEmail}`}
                        className="text-blue-600 hover:underline font-medium break-all"
                      >
                        {decisionMakerEmail}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(decisionMakerEmail, "dm_email")}
                        className="text-neutral-400 hover:text-neutral-700"
                        title="Copy email"
                      >
                        {copiedField === "dm_email" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-neutral-400 italic">Not found</span>
                  )}
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Direct Phone</span>
                  {decisionMakerPhone ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <a
                        href={`tel:${decisionMakerPhone}`}
                        className="text-neutral-900 hover:underline font-semibold"
                      >
                        {decisionMakerPhone}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(decisionMakerPhone, "dm_phone")}
                        className="text-neutral-400 hover:text-neutral-700"
                        title="Copy phone"
                      >
                        {copiedField === "dm_phone" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-neutral-400 italic">Not found</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4 Separate Assessment Dimensions */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Multidimensional Assessment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* 1. Business Fit */}
              <div className="rounded-8 border border-neutral-200 bg-neutral-50/50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-heat-100" />
                    <span>1. Business Fit</span>
                  </span>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    {dimBusiness?.score !== undefined ? `${dimBusiness.score}/100` : `${lead?.fit_score ?? 0}/100`}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  {dimBusiness?.reasons?.[0] ||
                    "Evaluates offering alignment, target industry, and ideal customer profile criteria."}
                </p>
              </div>

              {/* 2. Evidence Completeness */}
              <div className="rounded-8 border border-neutral-200 bg-neutral-50/50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2. Evidence Completeness</span>
                  </span>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    {dimEvidence
                      ? `${Math.round((dimEvidence.verified_count / Math.max(1, dimEvidence.verified_count + dimEvidence.unknown_count)) * 100)}%`
                      : `${lead?.evidence?.length ? Math.min(100, lead.evidence.length * 25) : 50}%`}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  {dimEvidence
                    ? `${dimEvidence.verified_count} verified criteria, ${dimEvidence.unknown_count} unknown.`
                    : "Assesses supporting quotes and verified citations across criteria."}
                </p>
              </div>

              {/* 3. Contact Availability & Verification */}
              <div className="rounded-8 border border-neutral-200 bg-neutral-50/50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>3. Contact Availability</span>
                  </span>
                  <span
                    className={`font-semibold text-[11px] ${
                      lead?.email || lead?.phone ? "text-emerald-700" : "text-neutral-500"
                    }`}
                  >
                    {lead?.email && lead?.phone
                      ? "Email & Phone"
                      : lead?.email
                      ? "Email only"
                      : lead?.phone
                      ? "Phone only"
                      : "No direct contact"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  {dimContact?.status === "ready"
                    ? "Direct communication channel available and verified."
                    : "Direct channels found via public directory/website. Attributed claim; not guaranteed inbox deliverability."}
                </p>
              </div>

              {/* 4. Outreach Eligibility */}
              <div className="rounded-8 border border-neutral-200 bg-neutral-50/50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>4. Outreach Eligibility</span>
                  </span>
                  <span className="font-semibold text-[11px] text-amber-700">
                    {dimOutreach?.eligible ? "Authorized" : "Action Required"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  {dimOutreach?.reason ||
                    "Scraped/public contacts require explicit campaign enrollment. Prior opt-in is not assumed."}
                </p>
              </div>
            </div>
          </div>

          {/* Criterion-Level Evaluations */}
          {lead?.criterion_evaluations && lead.criterion_evaluations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Criterion-Level Evidence Breakdown
              </h3>
              <div className="border border-neutral-200 rounded-8 overflow-hidden divide-y divide-neutral-100 text-xs">
                {lead.criterion_evaluations.map((ev, idx) => {
                  const isMatched = ev.status === "matched";
                  const isUnmet = ev.status === "unmet";
                  const isUnknown = ev.status === "unknown";

                  return (
                    <div key={idx} className="p-3 bg-white space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900 capitalize">
                            {ev.criterion.replace(/_/g, " ")}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                              ev.mandatory
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {ev.mandatory ? "Mandatory" : "Preferred"}
                          </span>
                        </div>

                        {/* Outcome badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isMatched
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : isUnmet
                              ? "bg-red-50 text-red-800 border border-red-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isMatched && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isUnmet && <XCircle className="w-3 h-3 text-red-600" />}
                          {isUnknown && <HelpCircle className="w-3 h-3 text-amber-600" />}
                          <span className="capitalize">{ev.status}</span>
                        </span>
                      </div>

                      {ev.explanation && (
                        <p className="text-[11px] text-neutral-600 leading-relaxed">{ev.explanation}</p>
                      )}

                      {ev.quote && (
                        <blockquote className="text-[11px] text-neutral-500 italic border-l-2 border-neutral-300 pl-2 leading-relaxed">
                          "{ev.quote}"
                        </blockquote>
                      )}

                      {ev.source_url && (
                        <div className="text-[11px] text-neutral-400 pt-0.5">
                          <a
                            href={ensureAbsoluteUrl(ev.source_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Source reference</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Two-Column Layout for Contact & Research notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-neutral-200/80">
            {/* Left Column: Contact & Captured fields */}
            <div className="space-y-6">
              {/* Contact */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-3.5">Company Contact</h3>
                <div className="space-y-3.5 text-xs">
                  {/* Website */}
                  <div>
                    <span className="block font-medium text-neutral-400 mb-0.5">Website</span>
                    {lead?.website ? (
                      <a
                        href={ensureAbsoluteUrl(lead.website)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline break-all"
                      >
                        <span>{cleanDomain(lead.website)}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-neutral-500">Not found</span>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <span className="block font-medium text-neutral-400 mb-0.5">Main Phone</span>
                    {lead?.phone ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${lead.phone}`}
                          className="font-semibold text-neutral-900 hover:underline"
                        >
                          {lead.phone}
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(lead.phone!, "phone")}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                          title="Copy phone"
                        >
                          {copiedField === "phone" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <Check className="h-3 w-3" />
                              <span>Copied</span>
                            </span>
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-500">Not found</span>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <span className="block font-medium text-neutral-400 mb-0.5">Main Email</span>
                    {lead?.email ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${lead.email}`}
                          className="font-medium text-blue-600 hover:underline break-all"
                        >
                          {lead.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(lead.email!, "email")}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                          title="Copy email"
                        >
                          {copiedField === "email" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <Check className="h-3 w-3" />
                              <span>Copied</span>
                            </span>
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-500">Not found</span>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <span className="block font-medium text-neutral-400 mb-0.5">Location</span>
                    <span className="text-neutral-800 font-medium">
                      {lead?.location || "Not specified"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Captured fields */}
              {lead?.discovered_fields && Object.keys(lead.discovered_fields).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 mb-3.5">Captured Attributes</h3>
                  <div className="space-y-3 text-xs">
                    {Object.entries(lead.discovered_fields).map(([key, val]) => (
                      <div key={key}>
                        <span className="block font-medium text-neutral-400 mb-0.5">
                          {formatFieldLabel(key)}
                        </span>
                        <p className="text-neutral-900 leading-snug break-words">
                          {String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Research notes & Provenance */}
            <div className="space-y-6">
              {/* Research notes */}
              {lead?.summary && (
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 mb-2">Research Notes</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                    {lead.summary}
                  </p>
                </div>
              )}

              {/* Provenance and Attribution */}
              <div className="rounded-8 border border-neutral-200 bg-neutral-50 p-3.5 text-xs space-y-2">
                <span className="font-bold text-neutral-900 block">Provenance & Audit Trail</span>
                <div className="space-y-1 text-neutral-600">
                  <p>
                    <span className="font-semibold text-neutral-700">Source Type: </span>
                    <span className="font-mono">
                      {lead?.provenance?.source_type || "Built-in Web Research"}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-neutral-700">Criteria Version: </span>
                    <span className="font-mono">{lead?.criteria_version || "v1"}</span>
                  </p>
                  {lead?.provenance?.ingested_at && (
                    <p>
                      <span className="font-semibold text-neutral-700">Ingested At: </span>
                      <span className="tabular-nums font-mono">
                        {lead.provenance.ingested_at}
                      </span>
                    </p>
                  )}
                  {lead?.checked_at && (
                    <p>
                      <span className="font-semibold text-neutral-700">Evaluated At: </span>
                      <span className="tabular-nums font-mono">{lead.checked_at}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Source Evidence Table */}
          {lead?.evidence && lead.evidence.length > 0 && (
            <div className="pt-2">
              <h3 className="text-sm font-bold text-neutral-900">Source Evidence Cites</h3>
              <p className="mt-0.5 text-xs text-neutral-500 mb-3">
                Verifiable public quotes and URLs supporting this qualification.
              </p>

              <div className="overflow-x-auto border border-neutral-200 rounded-8">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                    <tr>
                      <th scope="col" className="py-2.5 px-4 font-semibold w-28">Field</th>
                      <th scope="col" className="py-2.5 px-4 font-semibold">Finding & quote</th>
                      <th scope="col" className="py-2.5 px-4 text-right font-semibold w-20">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {lead.evidence.map((ev, idx) => (
                      <tr key={idx} className="align-top hover:bg-neutral-50/50">
                        <td className="py-3 px-4 font-semibold text-neutral-900 whitespace-nowrap">
                          {formatFieldLabel(ev.field)}
                        </td>
                        <td className="py-3 px-4">
                          {ev.value && (
                            <p className="font-medium text-neutral-900">{ev.value}</p>
                          )}
                          {ev.quote && (
                            <p className="mt-0.5 text-neutral-500 italic leading-relaxed">
                              "{ev.quote}"
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {ev.source_url ? (
                            <a
                              href={ensureAbsoluteUrl(ev.source_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:underline"
                            >
                              <span>View</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-neutral-400">—</span>
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

        {/* Fixed Footer */}
        <div className="border-t border-neutral-200 px-6 py-4 sm:px-8 flex items-center justify-between text-xs bg-white">
          <span className="font-mono text-neutral-400">
            Candidate ID {candidate.id.slice(0, 14)}…
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-neutral-300 bg-white px-3.5 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shadow-xs"
          >
            Close details
          </button>
        </div>
      </aside>

      {/* EMAIL OUTREACH MODAL */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/40">
          <div className="bg-white rounded-12 shadow-xl border border-neutral-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-neutral-900 text-base">Direct Email Outreach</h3>
              </div>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cold outreach compliance alert */}
            <div className="rounded-8 border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cold Outreach Compliance Notice</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Contact information was retrieved from public sources. This recipient has not opted
                in to marketing campaigns. Communications must adhere to anti-spam laws, including
                accurate sender identification and a functional opt-out mechanism.
              </p>
            </div>

            {/* Email automation service status */}
            <div className="rounded-8 border border-neutral-200 bg-neutral-50 p-2.5 text-[11px] text-neutral-600">
              <span className="font-semibold text-neutral-700">Automation Engine: </span>
              <span>
                Connected to Email Automation Boundary. Real sending is controlled by the external email integration. In demo mode, drafts are recorded without unauthorized dispatches.
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Recipient</label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-6 text-neutral-800"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-6 text-neutral-800"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Message Draft</label>
                <textarea
                  rows={5}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-6 text-neutral-800 font-sans"
                />
              </div>
            </div>

            {emailOutcome && (
              <div
                className={`p-3 rounded-8 text-xs ${
                  emailOutcome.ok
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                    : "bg-red-50 border border-red-200 text-red-900"
                }`}
              >
                <p className="font-semibold">{emailOutcome.message}</p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="px-3 py-2 rounded-6 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium"
              >
                Close
              </button>
              <button
                type="button"
                disabled={emailSending || !emailRecipient}
                onClick={() => void handleSendEmail()}
                className="px-4 py-2 rounded-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{emailSending ? "Recording draft…" : "Dispatch via Adapter"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI VOICE CALL MODAL */}
      {phoneModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/40">
          <div className="bg-white rounded-12 shadow-xl border border-neutral-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-neutral-900 text-base">Initiate AI Voice Call</h3>
              </div>
              <button
                type="button"
                onClick={() => setPhoneModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Telephony configuration & honest demo notice */}
            <div className="rounded-8 border border-neutral-200 bg-neutral-50 p-3 text-xs space-y-1">
              <span className="font-bold text-neutral-800 block">
                Telephony Provider: voice-service (CPaaS)
              </span>
              <p className="text-neutral-600 leading-relaxed">
                Outbound voice calls use your configured CPaaS trunk (e.g. Twilio or SIP provider). In demo mode, live phone dispatches are simulated safely without incurring external charges.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Prospect Number</label>
                <input
                  type="text"
                  value={phoneRecipient}
                  onChange={(e) => setPhoneRecipient(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-6 text-neutral-800"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Human Transfer Destination (Required)
                </label>
                <input
                  type="text"
                  value={humanTransferDestination}
                  onChange={(e) => setHumanTransferDestination(e.target.value)}
                  placeholder="+1-800-555-0199 or staff SIP address"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-6 text-neutral-800"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  If the prospect asks to speak with a human agent or transfer triggers fire, the AI seamlessly transfers the call here.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={explicitPhoneConsent}
                    onChange={(e) => setExplicitPhoneConsent(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-neutral-700 leading-normal">
                    I explicitly authorize initiating this call to the target prospect within permitted calling hours, in accordance with applicable telephony and telemarketing regulations.
                  </span>
                </label>
              </div>
            </div>

            {phoneOutcome && (
              <div
                className={`p-3 rounded-8 text-xs ${
                  phoneOutcome.ok
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                    : "bg-amber-50 border border-amber-200 text-amber-900"
                }`}
              >
                <p className="font-semibold">{phoneOutcome.message}</p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPhoneModalOpen(false)}
                className="px-3 py-2 rounded-6 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium"
              >
                Close
              </button>
              <button
                type="button"
                disabled={phoneCalling || !explicitPhoneConsent || !phoneRecipient}
                onClick={() => void handleInitiateCall()}
                className="px-4 py-2 rounded-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{phoneCalling ? "Checking provider…" : "Authorize & Call"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
