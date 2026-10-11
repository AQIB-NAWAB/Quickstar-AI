"use client";

import { AlertCircle,ArrowLeft,ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDuration,formatUtcDateTime } from "../lib/format";
import type { CampaignContact,ContactAttempt } from "../lib/types";
import { ContactStatusBadge } from "./campaign-status-badge";

interface ContactAttemptHistoryProps {
  contact: CampaignContact;
  attempts: ContactAttempt[];
  campaignName: string;
  backUrl: string;
  workspaceVoiceUrl?: string;
}

export function ContactAttemptHistory({
  contact,
  attempts,
  campaignName,
  backUrl,
  workspaceVoiceUrl,
}: ContactAttemptHistoryProps) {
  return (
    <div className="space-y-4">
      <div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-[#e04e10] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to campaign contacts</span>
        </Link>
      </div>

      {/* Contact Summary Card */}
      <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-accent-black">
              {contact.name || "Unnamed contact"}
            </h2>
            <ContactStatusBadge status={contact.status} />
          </div>
          <p className="text-xs text-neutral-500 font-mono">
            {contact.phone}
          </p>
          <p className="text-[11px] text-neutral-400">
            Campaign: <span className="font-semibold text-neutral-600">{campaignName}</span> &middot; ID: {contact.id}
          </p>
        </div>

        {contact.customFields && Object.keys(contact.customFields).length > 0 && (
          <div className="text-xs space-y-1 sm:text-right border-t sm:border-t-0 sm:border-l border-border-faint pt-2 sm:pt-0 sm:pl-4">
            {Object.entries(contact.customFields).map(([k, v]) => (
              <p key={k} className="text-neutral-500">
                <span className="text-neutral-400">{k}:</span> {v}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Attempts Table Card */}
      <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-accent-black tracking-tight">
          Call attempt timeline
        </h3>

        <div className="overflow-x-auto border-t border-border-faint pt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-faint text-neutral-400 font-medium">
                <th className="py-2 px-3 font-medium">Attempt #</th>
                <th className="py-2 px-3 font-medium">Started (UTC)</th>
                <th className="py-2 px-3 font-medium">Duration</th>
                <th className="py-2 px-3 font-medium">Status / Outcome</th>
                <th className="py-2 px-3 font-medium text-right">Associated Call</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint text-neutral-700">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400 italic">
                    No attempts recorded yet for this contact.
                  </td>
                </tr>
              ) : (
                attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-accent-black">
                      Attempt {att.attemptNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-500 text-[11px]">
                      {formatUtcDateTime(att.startedAt)}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {formatDuration(att.durationSeconds)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div>
                        <span className="font-semibold text-accent-black">
                          {att.outcome}
                        </span>
                        {att.error && (
                          <div className="flex items-center gap-1 text-[11px] text-red-600 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{att.error.message}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {att.callId ? (
                        workspaceVoiceUrl ? (
                          <Link
                            href={`${workspaceVoiceUrl}/${encodeURIComponent(att.callId)}`}
                            className="inline-flex items-center gap-1 text-heat-100 hover:underline font-mono"
                          >
                            <span>{att.callId}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="font-mono text-neutral-600">{att.callId}</span>
                        )
                      ) : (
                        <span className="text-neutral-400 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
