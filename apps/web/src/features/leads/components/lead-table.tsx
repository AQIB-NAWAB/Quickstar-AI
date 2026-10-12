"use client";

import { formatUtcCaptured,isValidEmail,isValidPhone } from "../lib/format";
import type { LeadSummary } from "../lib/types";
import { LeadStatusBadge } from "./lead-status-badge";
import { QualificationIndicator } from "./qualification-indicator";
import { SentimentLabel } from "./sentiment-label";

interface LeadTableProps {
  leads: LeadSummary[];
  selectedLeadId: string | null;
  isSampleData?: boolean;
  onSelectLead: (leadId: string) => void;
}

export function LeadTable({
  leads,
  selectedLeadId,
  isSampleData = false,
  onSelectLead,
}: LeadTableProps) {
  return (
    <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-faint bg-neutral-50/50 text-neutral-400 font-medium">
              <th className="py-2.5 px-3 font-medium">Contact</th>
              <th className="py-2.5 px-3 font-medium">Intent</th>
              <th className="py-2.5 px-3 font-medium">Qualification</th>
              <th className="py-2.5 px-3 font-medium">Sentiment</th>
              <th className="py-2.5 px-3 font-medium">Status</th>
              <th className="py-2.5 px-3 font-medium">Tags</th>
              <th className="py-2.5 px-3 font-medium">Captured</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-faint text-neutral-700">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400 italic">
                  No leads match these filters.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const isSelected = lead.id === selectedLeadId;
                const displayName = lead.name || lead.email || lead.phone || "Unnamed lead";

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className={`transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-orange-50/50 font-medium"
                        : "hover:bg-neutral-50/80"
                    }`}
                  >
                    {/* 1. Contact */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-accent-black leading-tight">
                          {displayName}
                        </p>
                        {lead.email && (
                          <p className="text-[11px] text-neutral-500">
                            {isValidEmail(lead.email) ? (
                              <a
                                href={`mailto:${lead.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-heat-100 hover:underline"
                              >
                                {lead.email}
                              </a>
                            ) : (
                              lead.email
                            )}
                          </p>
                        )}
                        {lead.phone && (
                          <p className="text-[11px] text-neutral-500 font-mono">
                            {isValidPhone(lead.phone) ? (
                              <a
                                href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-heat-100"
                              >
                                {lead.phone}
                              </a>
                            ) : (
                              lead.phone
                            )}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* 2. Intent */}
                    <td className="py-3 px-3 text-neutral-800 font-medium">
                      {lead.intent || "—"}
                    </td>

                    {/* 3. Qualification */}
                    <td className="py-3 px-3">
                      <QualificationIndicator
                        score={lead.qualificationScore}
                        max={lead.qualificationMax}
                        isCompact={true}
                      />
                    </td>

                    {/* 4. Sentiment */}
                    <td className="py-3 px-3">
                      <SentimentLabel sentiment={lead.sentiment} />
                    </td>

                    {/* 5. Status */}
                    <td className="py-3 px-3">
                      <LeadStatusBadge status={lead.status} />
                    </td>

                    {/* 6. Tags */}
                    <td className="py-3 px-3">
                      {lead.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 items-center max-w-[140px]">
                          {lead.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-600 border border-neutral-200"
                            >
                              {t}
                            </span>
                          ))}
                          {lead.tags.length > 2 && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              +{lead.tags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    {/* 7. Captured */}
                    <td className="py-3 px-3 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                      {formatUtcCaptured(lead.capturedAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {leads.length > 0 && (
        <div className="px-3 py-2.5 bg-neutral-50/50 border-t border-border-faint flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-neutral-400">
          <span>
            Showing 1&ndash;{leads.length} {isSampleData ? "sample leads" : "leads"}
          </span>
          <span className="italic">
            Scores and intent are extracted signals, not verified contact facts.
          </span>
        </div>
      )}
    </div>
  );
}
