"use client";

import { AlertCircle,PhoneCall } from "lucide-react";
import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import { formatDuration,formatUtcDateTime } from "../lib/format";
import { getCampaignRepository } from "../lib/repository";
import type { CampaignRepository,OutboundCall,RepositoryResult } from "../lib/types";

interface OutboundCallsListProps {
  workspaceId: string;
  isPreview?: boolean;
  repository?: CampaignRepository;
  baseRoute?: string;
}

export function OutboundCallsList({
  workspaceId,
  isPreview = false,
  repository,
  baseRoute,
}: OutboundCallsListProps) {
  const repo = useMemo(
    () => repository ?? getCampaignRepository(isPreview),
    [repository, isPreview],
  );
  const basePath = baseRoute || (isPreview ? "/preview/voice/outbound" : `/workspaces/${workspaceId}/voice/outbound`);

  const [result, setResult] = useState<RepositoryResult<OutboundCall[]> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    repo
      .listOutboundCalls(workspaceId, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setResult(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setResult({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load outbound calls",
        });
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [repo, workspaceId]);

  const calls = result?.status === "ready" ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-accent-black">
          Outbound Calls
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Review dialed outbound voice calls, transcripts, and telephony outcomes.
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-3">
          <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
          <div className="h-10 bg-neutral-50 rounded-8 w-full animate-pulse" />
          <div className="h-10 bg-neutral-50 rounded-8 w-full animate-pulse" />
        </div>
      ) : result?.status === "unavailable" ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center space-y-3 max-w-lg mx-auto my-6">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <PhoneCall className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">
            Outbound voice calling is not available yet.
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {result.message || "Telephony carrier and outbound dialer workers are not connected."}
          </p>
        </div>
      ) : result?.status === "error" ? (
        <div className="bg-red-50 border border-red-200 rounded-12 p-6 text-center space-y-2 max-w-lg mx-auto">
          <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
          <h2 className="text-sm font-semibold text-red-900">Failed to load calls</h2>
          <p className="text-xs text-red-700">{result.message}</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-white border border-border-faint rounded-12 p-12 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
            <PhoneCall className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">No outbound calls yet.</h2>
          <p className="text-xs text-neutral-500">
            Outbound calls will be listed here when campaigns initiate calls.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/60 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-3">Campaign</th>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Started (UTC)</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-accent-black">
                        {call.contactName || "Unknown contact"}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        {call.phone}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-neutral-700">
                      {call.campaignName}
                    </td>
                    <td className="py-3 px-3 text-neutral-600">
                      {call.agentName}
                    </td>
                    <td className="py-3 px-3 text-neutral-600 whitespace-nowrap text-[11px]">
                      {formatUtcDateTime(call.startedAt)}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-700 whitespace-nowrap">
                      {formatDuration(call.durationSeconds)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {call.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`${basePath}/${call.id}`}
                        className="text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
                      >
                        View call &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
