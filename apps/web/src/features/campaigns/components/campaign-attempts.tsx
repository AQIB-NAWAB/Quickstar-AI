"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDuration,formatUtcDateTime } from "../lib/format";
import type { ContactAttempt } from "../lib/types";

interface CampaignAttemptsProps {
  attempts: ContactAttempt[];
  campaignBaseUrl: string;
  workspaceVoiceUrl?: string;
}

export function CampaignAttempts({
  attempts,
  campaignBaseUrl,
  workspaceVoiceUrl,
}: CampaignAttemptsProps) {
  return (
    <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs space-y-3 p-5">
      <div>
        <h3 className="text-sm font-bold text-accent-black tracking-tight">
          All call attempts
        </h3>
        <p className="text-[11px] text-neutral-400">
          Chronological record of dialed attempts for this campaign.
        </p>
      </div>

      <div className="overflow-x-auto border-t border-border-faint pt-2">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-faint text-neutral-400 font-medium">
              <th className="py-2 px-3 font-medium">Attempt #</th>
              <th className="py-2 px-3 font-medium">Contact ID</th>
              <th className="py-2 px-3 font-medium">Started (UTC)</th>
              <th className="py-2 px-3 font-medium">Duration</th>
              <th className="py-2 px-3 font-medium">Status / Outcome</th>
              <th className="py-2 px-3 font-medium text-right">Associated Call</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-faint text-neutral-700">
            {attempts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-neutral-400 italic">
                  No call attempts recorded yet.
                </td>
              </tr>
            ) : (
              attempts.map((att) => (
                <tr key={att.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-semibold text-accent-black">
                    Attempt {att.attemptNumber}
                  </td>
                  <td className="py-2.5 px-3">
                    <Link
                      href={`${campaignBaseUrl}/contacts/${encodeURIComponent(att.contactId)}`}
                      className="font-mono text-heat-100 hover:underline"
                    >
                      {att.contactId}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-neutral-500 text-[11px]">
                    {formatUtcDateTime(att.startedAt)}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {formatDuration(att.durationSeconds)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-accent-black">
                      {att.outcome}
                    </span>
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

      <div className="pt-2 border-t border-border-faint text-[11px] text-neutral-400 flex items-center justify-between">
        <span>Showing {attempts.length} attempts</span>
        <span className="italic">Attempt counts exceed unique contact count when retries occur.</span>
      </div>
    </div>
  );
}
