"use client";

import {
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { LeadGenerationCandidateResult } from "../lib/types";

interface LeadDetailDrawerProps {
  candidate: LeadGenerationCandidateResult;
  onClose: () => void;
}

export function LeadDetailDrawer({ candidate, onClose }: LeadDetailDrawerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const lead = candidate.assessment;

  function handleClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 240);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function copyToClipboard(text: string, fieldName: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 1800);
    });
  }

  const isAccepted = candidate.status === "accepted";
  const fitScore = lead?.fit_score ?? 0;

  return (
    <aside
      className={`fixed inset-y-0 right-0 !m-0 !mt-0 z-50 flex w-full max-w-full flex-col border-l border-neutral-200 bg-white shadow-2xl sm:w-[440px] md:w-[480px] lg:w-[520px] ${
        closing ? "animate-drawer-out" : "animate-drawer-in"
      }`}
      aria-label="Lead details panel"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 bg-neutral-50/70">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 font-bold">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-neutral-900">
              {lead?.company_name || candidate.id.slice(0, 8)}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  isAccepted
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : candidate.status === "duplicate"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                }`}
              >
                {candidate.status}
              </span>
              {lead && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 border border-orange-200">
                  <Sparkles className="h-3 w-3" />
                  Fit: {fitScore}/100
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          title="Close details"
          aria-label="Close details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Core Contact & Overview Cards */}
        <section className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Contact Information
          </h4>
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-xs">
            {/* Email */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Mail className="h-4 w-4 text-neutral-400" />
                <span className="font-medium">Email:</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {lead?.email ? (
                  <>
                    <a
                      href={`mailto:${lead.email}`}
                      className="font-medium text-blue-600 hover:underline max-w-[200px] truncate"
                    >
                      {lead.email}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(lead.email!, "email")}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                      title="Copy email"
                    >
                      {copiedField === "email" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-neutral-400 italic">Not available</span>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Phone className="h-4 w-4 text-neutral-400" />
                <span className="font-medium">Phone:</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {lead?.phone ? (
                  <>
                    <a
                      href={`tel:${lead.phone}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {lead.phone}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(lead.phone!, "phone")}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                      title="Copy phone"
                    >
                      {copiedField === "phone" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-neutral-400 italic">Not available</span>
                )}
              </div>
            </div>

            {/* Website */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Globe className="h-4 w-4 text-neutral-400" />
                <span className="font-medium">Website:</span>
              </div>
              <div className="text-xs">
                {lead?.website ? (
                  <a
                    href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline max-w-[220px] truncate"
                  >
                    <span>{lead.website.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-neutral-400 italic">Not available</span>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <MapPin className="h-4 w-4 text-neutral-400" />
                <span className="font-medium">Location:</span>
              </div>
              <span className="text-xs font-medium text-neutral-800">
                {lead?.location || "Not specified"}
              </span>
            </div>

            {/* Category */}
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <Tag className="h-4 w-4 text-neutral-400" />
                <span className="font-medium">Category:</span>
              </div>
              <span className="text-xs font-medium text-neutral-800">
                {lead?.category || "General"}
              </span>
            </div>
          </div>
        </section>

        {/* Captured fields */}
        {lead?.discovered_fields && Object.keys(lead.discovered_fields).length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Captured fields
            </h4>
            <div className="rounded-xl border border-neutral-200 bg-white p-3 divide-y divide-neutral-100 shadow-xs">
              {Object.entries(lead.discovered_fields).map(([key, val]) => (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 first:pt-0 last:pb-0 gap-1 text-xs"
                >
                  <span className="font-medium text-neutral-600 capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span className="font-medium text-neutral-900 break-words text-xs">
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI Research Summary */}
        {lead?.summary && (
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Agent Research Summary
            </h4>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3.5 text-xs leading-relaxed text-neutral-700">
              {lead.summary}
            </div>
          </section>
        )}

        {/* Fit Analysis & Reasons */}
        {lead?.fit_reasons && lead.fit_reasons.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Fit Evaluation Reasons
            </h4>
            <ul className="space-y-1.5">
              {lead.fit_reasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-white p-2.5 text-xs text-neutral-700"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Evidence Citations */}
        {lead?.evidence && lead.evidence.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Discovered Evidence & Citations
            </h4>
            <div className="space-y-2">
              {lead.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-neutral-200 bg-white p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 uppercase text-[10px] tracking-wide">
                      {ev.field}
                    </span>
                    {ev.source_url && (
                      <a
                        href={ev.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                      >
                        <span>Source</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  {ev.value && (
                    <p className="font-semibold text-neutral-800">{ev.value}</p>
                  )}
                  {ev.quote && (
                    <blockquote className="border-l-2 border-orange-300 pl-2 text-[11px] italic text-neutral-500">
                      "{ev.quote}"
                    </blockquote>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="border-t border-neutral-200 p-4 bg-neutral-50/70 flex items-center justify-between text-xs text-neutral-500">
        <span>ID: {candidate.id.slice(0, 12)}…</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          Close
        </button>
      </div>
    </aside>
  );
}
