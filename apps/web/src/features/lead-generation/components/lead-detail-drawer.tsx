"use client";

import {
  Check,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LeadGenerationCandidateResult, LeadRunInput } from "../lib/types";
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
  onClose: () => void;
}

export function LeadDetailDrawer({ candidate, brief, onClose }: LeadDetailDrawerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const lead = candidate.assessment;
  const drawerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

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

    // Focus close button initially
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
  }, [handleClose]);

  function copyToClipboard(text: string, fieldName: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    });
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
  } else if (isRejected) {
    bannerTitle = "Candidate does not meet qualification criteria";
    bannerSubtitle = lead?.fit_reasons?.[0] || "Research indicated insufficient fit with target criteria.";
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

  // Parse structured qualification items from fit_reasons
  const qualificationItems = (lead?.fit_reasons ?? []).map((reason) => {
    const lower = reason.toLowerCase();
    let label = "Assessment criterion";
    let status = "Noted";
    let isMissing = false;

    if (lower.includes("location")) {
      label = "Target location";
    } else if (lower.includes("email")) {
      label = brief?.required_contact === "email" ? "Required email" : "Email contact";
    } else if (lower.includes("phone")) {
      label = brief?.required_contact === "phone" ? "Required phone" : "Phone contact";
    } else if (lower.includes("role")) {
      label = "Contact role";
    } else if (lower.includes("category")) {
      label = "Business category";
    } else if (lower.includes("size")) {
      label = "Company size";
    }

    if (
      lower.includes("not found") ||
      lower.includes("no ") ||
      lower.includes("missing") ||
      lower.includes("not available") ||
      lower.includes("unsupported") ||
      lower.includes("not publicly listed")
    ) {
      status = "Missing";
      isMissing = true;
    } else if (
      lower.includes("matches") ||
      lower.includes("present") ||
      lower.includes("provided") ||
      lower.includes("verified") ||
      lower.includes("found")
    ) {
      status = "Matches";
      isMissing = false;
    }

    return { label, status, isMissing, reason };
  });

  const businessDisplayName =
    lead?.company_name?.trim() || cleanDomain(lead?.website) || "Unnamed candidate";

  return (
    <>
      {/* Light translucent backdrop without heavy blur */}
      <div
        className={`fixed inset-0 !m-0 !mt-0 z-40 bg-neutral-900/25 transition-opacity duration-200 ${
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
        className={`fixed inset-y-0 right-0 !m-0 !mt-0 z-50 flex w-full max-w-full flex-col border-l border-neutral-200 bg-white shadow-2xl sm:w-[540px] md:w-[680px] lg:w-[780px] xl:w-[840px] ${
          closing ? "animate-drawer-out" : "animate-drawer-in"
        }`}
      >
        {/* Fixed Header */}
        <div className="border-b border-neutral-200 px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Business details</span>
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

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2
              id="drawer-business-title"
              className="text-2xl font-bold tracking-tight text-neutral-900 break-words"
            >
              {businessDisplayName}
            </h2>

            {/* Candidate status pill with small dot */}
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

          {lead?.category && (
            <p className="mt-1 text-sm text-neutral-500">{lead.category}</p>
          )}
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

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-neutral-200/80">
            {/* Left Column: Contact & Captured fields */}
            <div className="space-y-6">
              {/* Contact */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-3.5">Contact</h3>
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
                    <span className="block font-medium text-neutral-400 mb-0.5">Phone</span>
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
                          aria-label="Copy phone"
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
                    <span className="block font-medium text-neutral-400 mb-0.5">Email</span>
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
                          aria-label="Copy email"
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
                  <h3 className="text-sm font-bold text-neutral-900 mb-3.5">Captured fields</h3>
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

            {/* Right Column: Qualification & Research notes */}
            <div className="space-y-6">
              {/* Qualification */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 mb-3.5">Qualification</h3>
                {qualificationItems.length > 0 ? (
                  <div className="space-y-3.5 text-xs">
                    {qualificationItems.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-900">{item.label}</span>
                          <span
                            className={`font-semibold text-xs ${
                              item.isMissing ? "text-orange-600" : "text-neutral-900"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-neutral-500 leading-relaxed">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">
                    No specific qualification criteria reported.
                  </p>
                )}
              </div>

              {/* Research notes */}
              {lead?.summary && (
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 mb-2">Research notes</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                    {lead.summary}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Source Evidence Table */}
          {lead?.evidence && lead.evidence.length > 0 && (
            <div className="pt-2">
              <h3 className="text-sm font-bold text-neutral-900">Source evidence</h3>
              <p className="mt-0.5 text-xs text-neutral-500 mb-3">
                Public information used in this assessment.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-200 text-neutral-500 font-semibold">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-semibold w-28">Field</th>
                      <th scope="col" className="py-2 px-4 font-semibold">Finding & excerpt</th>
                      <th scope="col" className="py-2 pl-4 text-right font-semibold w-20">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {lead.evidence.map((ev, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-3 pr-4 font-semibold text-neutral-900 whitespace-nowrap">
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
                        <td className="py-3 pl-4 text-right whitespace-nowrap">
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
    </>
  );
}
