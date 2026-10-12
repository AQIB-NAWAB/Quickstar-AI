"use client";

import { AlertCircle,Phone,PhoneCall,Search } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";
import { formatDuration,formatFirstAudio,formatUtcDateTime } from "../lib/format";
import { getVoiceRepository } from "../lib/repository";
import type { InboundCall,RepositoryResult,VoiceRepository } from "../lib/types";
import { VoiceStatusBadge } from "./voice-status-badge";
import { VoiceSubnav } from "./voice-subnav";

interface InboundCallLogsProps {
  workspaceId: string;
  isPreview?: boolean;
  repository?: VoiceRepository;
  baseInboundUrl?: string;
}

export function InboundCallLogs({
  workspaceId,
  isPreview = false,
  repository,
  baseInboundUrl,
}: InboundCallLogsProps) {
  const repo = repository || getVoiceRepository(isPreview);
  const basePath = baseInboundUrl || (isPreview ? "/preview/voice/inbound" : `/workspaces/${workspaceId}/voice/inbound`);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rangePreset, setRangePreset] = useState<"7d" | "30d" | "custom">("7d");
  const [result, setResult] = useState<RepositoryResult<{ calls: InboundCall[] }> | null>(null);
  const [liveCallsResult, setLiveCallsResult] = useState<RepositoryResult<InboundCall[]> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      repo.listInboundCalls(workspaceId, { q: search, status: statusFilter, range: rangePreset }),
      repo.listLiveInboundCalls(workspaceId),
    ])
      .then(([callsRes, liveRes]) => {
        if (!cancelled) {
          setResult(callsRes);
          setLiveCallsResult(liveRes);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load inbound calls",
          });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo, workspaceId, search, statusFilter, rangePreset]);

  const calls = result?.status === "ready" ? result.data.calls : [];
  const liveCount = liveCallsResult?.status === "ready" ? liveCallsResult.data.length : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-accent-black">
            Inbound call logs
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Review inbound calls and open their transcripts and recordings.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`${basePath}/live`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-orange-200 text-heat-100 bg-orange-50/60 hover:bg-orange-100/60 text-xs font-semibold rounded-10 shadow-xs transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-heat-100 animate-pulse" />
            <span>{liveCount} live calls</span>
          </Link>
        </div>
      </div>

      {/* Voice Sub-navigation */}
      <VoiceSubnav workspaceId={workspaceId} isPreview={isPreview} liveCount={liveCount} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-border-faint rounded-12 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search caller or call ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-8 text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-heat-100 focus:border-heat-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter calls by status"
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100"
            >
              <option value="all">All statuses</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value as "7d" | "30d" | "custom")}
              aria-label="Filter calls by date range"
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-8 px-2.5 py-1.5 text-accent-black focus:outline-none focus:ring-1 focus:ring-heat-100"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-3">
          <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
          <div className="h-10 bg-neutral-50 rounded-8 w-full animate-pulse" />
          <div className="h-10 bg-neutral-50 rounded-8 w-full animate-pulse" />
        </div>
      ) : result?.status === "unavailable" ? (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center space-y-3 max-w-lg mx-auto my-6">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <Phone className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">
            Inbound voice calls are not available yet.
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {result.message || "This workspace’s telephony carrier service is not connected."}
          </p>
          <div className="pt-2">
            <Link
              href="/preview/voice/inbound"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
            >
              Explore sample inbound calls in visual preview &rarr;
            </Link>
          </div>
        </div>
      ) : result?.status === "error" ? (
        <div className="bg-red-50 border border-red-200 rounded-12 p-6 text-center space-y-2 max-w-lg mx-auto">
          <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
          <h2 className="text-sm font-semibold text-red-900">Failed to load calls</h2>
          <p className="text-xs text-red-700">{result.message}</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-white border border-border-faint rounded-12 p-12 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mx-auto text-heat-100">
            <PhoneCall className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">No inbound calls yet.</h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Inbound calls from customers will appear here with recording and transcript details.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border-faint rounded-12 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-faint bg-neutral-50/60 text-[11px] font-semibold text-neutral-500 ">
                  <th className="py-2.5 px-4">Caller</th>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">First audio</th>
                  <th className="py-2.5 px-3">Started (UTC)</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-accent-black font-mono">
                        {call.caller}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        {call.id}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-neutral-700 whitespace-nowrap">
                      {call.agentName}
                    </td>

                    <td className="py-3 px-3 font-mono text-neutral-700 whitespace-nowrap">
                      {formatDuration(call.durationSeconds)}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <VoiceStatusBadge status={call.status} />
                    </td>

                    <td className="py-3 px-3 font-mono text-neutral-600 whitespace-nowrap">
                      {formatFirstAudio(call.timeToFirstAudioMs)}
                    </td>

                    <td className="py-3 px-3 text-neutral-600 whitespace-nowrap text-[11px]">
                      {formatUtcDateTime(call.startedAt, false)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`${basePath}/${call.id}`}
                        className="inline-flex items-center text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
                      >
                        {call.status === "live" ? "Monitor" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer Helper & Pagination */}
          <div className="px-4 py-3 border-t border-border-faint bg-neutral-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-500">
            <div>
              <span>{calls.length} calls</span>
              <span className="mx-2">&middot;</span>
              <span>First audio = time to first agent audio.</span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                disabled
                className="px-2.5 py-1 rounded-6 border border-neutral-200 bg-white text-neutral-400 text-xs cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled
                className="px-2.5 py-1 rounded-6 border border-neutral-200 bg-white text-neutral-400 text-xs cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
