"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Mail,
  MessageSquare,
  Phone,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatFullUtcCaptured,
  formatLeadTag,
  getInitials,
  isValidEmail,
  isValidPhone,
} from "../lib/format";
import type { LeadDetail, LeadStatus } from "../lib/types";
import { LeadConversationTranscript } from "./lead-conversation-transcript";

interface LeadDetailDrawerProps {
  lead: LeadDetail;
  workspaceId?: string;
  isPreview?: boolean;
  isOutsideFilter?: boolean;
  onClose: () => void;
  onUpdateStatus?: (newStatus: LeadStatus) => Promise<void> | void;
}

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "qualified", "disqualified"];

function extractHostname(url?: string | null): string | null {
  if (!url) return null;
  try {
    const withProto =
      url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
    const parsed = new URL(withProto);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || null;
  }
}

function ensureAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export function LeadDetailDrawer({
  lead,
  workspaceId,
  isPreview = false,
  isOutsideFilter = false,
  onClose,
  onUpdateStatus,
}: LeadDetailDrawerProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [recordInfoOpen, setRecordInfoOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const drawerRef = useRef<HTMLElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  }, [closing, onClose]);

  // Accessibility: store trigger focus, lock scroll, trap focus, and handle Escape
  useEffect(() => {
    triggerElementRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button initially
    const closeBtn = drawerRef.current?.querySelector<HTMLElement>("button[aria-label='Close details']");
    closeBtn?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      triggerElementRef.current?.focus();
    };
  }, [handleClose]);

  async function handleSelectStatus(status: LeadStatus) {
    setStatusMenuOpen(false);
    if (status === lead.status) return;

    setIsUpdatingStatus(true);
    setStatusNotification(null);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(status);
      }
      if (isPreview) {
        setStatusNotification("Preview change only. Not persisted.");
      }
    } catch (err: unknown) {
      setStatusNotification(
        (err instanceof Error ? err.message : null) || "Failed to update status."
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function copyToClipboard(text: string, fieldName: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  const displayName = lead.name || lead.email || lead.phone || "Unnamed lead";
  const initials = getInitials(displayName);

  // Extract website from captured fields or URL fields
  const rawWebsite =
    (lead.capturedFields?.website as string | undefined) ||
    (lead.capturedFields?.url as string | undefined) ||
    (lead.capturedFields?.domain as string | undefined) ||
    null;
  const websiteHostname = extractHostname(rawWebsite);

  // Business details fields to exclude from generic list because shown elsewhere
  const excludeFields = new Set([
    "website",
    "url",
    "domain",
    "email",
    "phone",
    "name",
    "qualification",
    "intent",
    "sentiment",
  ]);

  const rawCompany =
    (lead.capturedFields?.company as string | undefined) ||
    (lead.capturedFields?.company_name as string | undefined) ||
    lead.name ||
    null;
  const rawCategory =
    (lead.capturedFields?.category as string | undefined) ||
    (lead.capturedFields?.target_category as string | undefined) ||
    (lead.tags?.[0] ?? null);
  const rawLocation =
    (lead.capturedFields?.location as string | undefined) ||
    (lead.capturedFields?.city as string | undefined) ||
    null;
  const rawProductCategory =
    (lead.capturedFields?.product_category as string | undefined) || null;

  // Other dynamic business fields
  const extraFields = Object.entries(lead.capturedFields || {}).filter(
    ([k, v]) => !excludeFields.has(k.toLowerCase()) && v !== undefined && v !== null
  );

  const score = lead.qualificationScore;
  const max = lead.qualificationMax ?? 100;
  const hasScore = score !== null && score !== undefined && !Number.isNaN(score);
  const percentage = hasScore ? Math.min(100, Math.max(0, (score / max) * 100)) : 0;

  return (
    <>
      {/* Light dimming backdrop (no blur, underlying table recognizable) */}
      <div
        className={`fixed inset-0 !m-0 !mt-0 z-40 bg-black/20 ${
          closing ? "animate-backdrop-out" : "animate-backdrop-in"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer anchored right: ~600-620px desktop, full width mobile */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Lead details"
        className={`lead-console lead-record-drawer fixed inset-y-0 right-0 !m-0 !mt-0 z-50 flex w-full max-w-full sm:w-[560px] lg:w-[620px] flex-col border-l border-neutral-200 bg-white shadow-xl ${
          closing ? "animate-drawer-out" : "animate-drawer-in"
        }`}
      >
        {/* Fixed Header: ~64px high */}
        <div className="h-16 px-6 border-b border-neutral-200 bg-white flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
            Lead details
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-6 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-1 focus:ring-heat-100"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ephemeral status / outside filter notifications */}
        {isOutsideFilter && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-800 shrink-0">
            This lead is outside the currently applied search or filters.
          </div>
        )}
        {statusNotification && (
          <div className="bg-neutral-100 border-b border-neutral-200 px-6 py-2 text-xs text-neutral-700 flex items-center justify-between shrink-0">
            <span>{statusNotification}</span>
            <button
              type="button"
              onClick={() => setStatusNotification(null)}
              className="text-neutral-400 hover:text-neutral-700 font-bold ml-2"
            >
              &times;
            </button>
          </div>
        )}

        {/* Independently scrolling body: padding ~24–28px */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Identity Section */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-8 bg-neutral-100 text-neutral-800 font-bold text-base flex items-center justify-center shrink-0 border border-neutral-200/60 uppercase">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xl font-bold text-neutral-900 leading-snug truncate">
                    {displayName}
                  </h4>
                  {websiteHostname && (
                    <p className="text-xs text-neutral-500 font-normal truncate mt-0.5">
                      {websiteHostname}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Dropdown */}
              <div className="relative shrink-0 text-right">
                <span className="text-[11px] text-neutral-400 font-medium block mb-1">
                  Status
                </span>
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((prev) => !prev)}
                  disabled={isUpdatingStatus}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-8 border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-800 shadow-xs transition-colors"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      lead.status === "qualified"
                        ? "bg-emerald-500"
                        : lead.status === "contacted"
                        ? "bg-blue-500"
                        : "bg-neutral-400"
                    }`}
                  />
                  <span className="capitalize">{lead.status}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {statusMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-neutral-200 rounded-8 shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                    {STATUS_OPTIONS.map((opt) => {
                      const isSelected = opt === lead.status;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectStatus(opt)}
                          className={`w-full px-3 py-2 text-left text-xs capitalize flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-orange-50 text-heat-100 font-semibold"
                              : "text-neutral-700 hover:bg-neutral-100"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                opt === "qualified"
                                  ? "bg-emerald-500"
                                  : opt === "contacted"
                                  ? "bg-blue-500"
                                  : "bg-neutral-400"
                              }`}
                            />
                            <span>{opt}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-heat-100" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Tags beneath identity */}
            {lead.tags && lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-6 text-xs bg-neutral-100 text-neutral-700 border border-neutral-200/60 font-medium"
                  >
                    {formatLeadTag(t)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200" />

          {/* Section: Contact Information */}
          <div className="space-y-3.5">
            <h5 className="text-sm font-bold text-neutral-900">Contact information</h5>

            <div className="space-y-3 text-xs">
              {/* Email */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2.5 text-neutral-500 w-28 shrink-0">
                  <Mail className="w-4 h-4 text-neutral-400" />
                  <span>Email</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  {lead.email ? (
                    <>
                      {isValidEmail(lead.email) ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-neutral-900 font-medium hover:text-heat-100 hover:underline truncate"
                        >
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-neutral-900 font-medium truncate">{lead.email}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(lead.email!, "email")}
                        className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                        title="Copy email"
                        aria-label="Copy email"
                      >
                        {copiedField === "email" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </>
                  ) : (
                    <span className="text-neutral-400">Not available</span>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2.5 text-neutral-500 w-28 shrink-0">
                  <Phone className="w-4 h-4 text-neutral-400" />
                  <span>Phone</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  {lead.phone ? (
                    <>
                      {isValidPhone(lead.phone) ? (
                        <a
                          href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                          className="text-neutral-900 font-medium hover:text-heat-100 hover:underline truncate font-sans"
                        >
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-neutral-900 font-medium truncate">{lead.phone}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(lead.phone!, "phone")}
                        className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                        title="Copy phone"
                        aria-label="Copy phone"
                      >
                        {copiedField === "phone" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </>
                  ) : (
                    <span className="text-neutral-400">Not available</span>
                  )}
                </div>
              </div>

              {/* Website */}
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2.5 text-neutral-500 w-28 shrink-0">
                  <Globe className="w-4 h-4 text-neutral-400" />
                  <span>Website</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  {rawWebsite ? (
                    <a
                      href={ensureAbsoluteUrl(rawWebsite)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1 truncate"
                    >
                      <span>{websiteHostname || rawWebsite}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-neutral-400">Not available</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200" />

          {/* Section: Business Details */}
          <div className="space-y-3.5">
            <h5 className="text-sm font-bold text-neutral-900">Business details</h5>

            <div className="space-y-2.5 text-xs">
              {rawCompany && (
                <div className="flex items-start justify-between py-0.5">
                  <span className="text-neutral-500 w-32 shrink-0">Company</span>
                  <span className="text-neutral-900 font-medium text-right flex-1 break-words">
                    {rawCompany}
                  </span>
                </div>
              )}
              {rawCategory && (
                <div className="flex items-start justify-between py-0.5">
                  <span className="text-neutral-500 w-32 shrink-0">Category</span>
                  <span className="text-neutral-900 font-medium text-right flex-1 break-words">
                    {rawCategory}
                  </span>
                </div>
              )}
              {rawLocation && (
                <div className="flex items-start justify-between py-0.5">
                  <span className="text-neutral-500 w-32 shrink-0">Location</span>
                  <span className="text-neutral-900 font-medium text-right flex-1 break-words">
                    {rawLocation}
                  </span>
                </div>
              )}
              {rawProductCategory && (
                <div className="flex items-start justify-between py-0.5">
                  <span className="text-neutral-500 w-32 shrink-0">Product category</span>
                  <span className="text-neutral-900 font-medium text-right flex-1 break-words">
                    {rawProductCategory}
                  </span>
                </div>
              )}

              {/* Extra dynamic fields */}
              {extraFields.map(([k, v]) => {
                const label = lead.attributeLabels?.[k] ?? k.replace(/_/g, " ");
                return (
                  <div key={k} className="flex items-start justify-between py-0.5">
                    <span className="text-neutral-500 w-32 shrink-0 capitalize">{label}</span>
                    <span className="text-neutral-900 font-medium text-right flex-1 break-words">
                      {String(v)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-neutral-200" />

          {/* Section: Qualification */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-900">
                <span>Qualification</span>
                <Info className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <div className="text-sm font-bold text-neutral-900 tabular-nums">
                {hasScore ? (
                  <>
                    <span>{score}</span>
                    <span className="text-neutral-400 font-normal"> / {max}</span>
                  </>
                ) : (
                  <span className="text-neutral-400 font-normal">Not scored</span>
                )}
              </div>
            </div>

            {/* Orange progress bar */}
            {hasScore && (
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="h-full bg-heat-100 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-400">AI fit assessment</p>
              </div>
            )}

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex items-start justify-between py-0.5">
                <span className="text-neutral-500 w-28 shrink-0">Intent</span>
                <span className="text-neutral-900 font-medium text-right flex-1">
                  {lead.intent || "Not captured"}
                </span>
              </div>
              <div className="flex items-start justify-between py-0.5">
                <span className="text-neutral-500 w-28 shrink-0">Sentiment</span>
                <span className="text-neutral-900 font-medium text-right flex-1 capitalize">
                  {lead.sentiment && lead.sentiment !== "unknown"
                    ? lead.sentiment
                    : "Not assessed"}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200" />

          {/* Section: Conversation */}
          <div className="space-y-3">
            <h5 className="text-sm font-bold text-neutral-900">Conversation</h5>
            {lead.originatingConversationId ? (
              <LeadConversationTranscript
                conversationId={lead.originatingConversationId}
                workspaceId={workspaceId}
                status={lead.transcriptStatus}
                messages={lead.transcriptMessages}
              />
            ) : (
              <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
                <MessageSquare className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>No linked conversation</span>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200" />

          {/* Section: Record information (collapsible disclosure) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setRecordInfoOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-left py-1 text-neutral-900 font-bold text-sm focus:outline-none"
            >
              <span>Record information</span>
              {recordInfoOpen ? (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              )}
            </button>
            <p className="text-xs text-neutral-500">
              {formatFullUtcCaptured(lead.capturedAt)}
            </p>

            {recordInfoOpen && (
              <div className="mt-3 p-3 rounded-8 bg-neutral-50 border border-neutral-200/80 space-y-2 text-xs font-mono animate-in fade-in duration-100">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-neutral-500 font-sans">Lead ID:</span>
                  <span className="text-neutral-800 break-all">{lead.id}</span>
                </div>
                {lead.source && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-neutral-500 font-sans">Source:</span>
                    <span className="text-neutral-800">{lead.source}</span>
                  </div>
                )}
                {lead.version !== undefined && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-neutral-500 font-sans">Version:</span>
                    <span className="text-neutral-800">{lead.version}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
