"use client";

import { AlertCircle,ArrowLeft,Bot,PhoneCall,User } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";
import { formatDuration,formatUtcDateTime } from "../lib/format";
import { getCampaignRepository } from "../lib/repository";
import type { CampaignRepository,OutboundCall,RepositoryResult } from "../lib/types";

interface OutboundCallDetailProps {
  workspaceId: string;
  callId: string;
  isPreview?: boolean;
  repository?: CampaignRepository;
  baseBackUrl?: string;
}

export function OutboundCallDetail({
  workspaceId,
  callId,
  isPreview = false,
  repository,
  baseBackUrl,
}: OutboundCallDetailProps) {
  const repo = repository || getCampaignRepository(isPreview);
  const backUrl = baseBackUrl || (isPreview ? "/preview/voice/outbound" : `/workspaces/${workspaceId}/voice/outbound`);

  const [result, setResult] = useState<RepositoryResult<OutboundCall> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    repo
      .getOutboundCall(workspaceId, callId)
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load call detail",
          });
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo, workspaceId, callId]);

  if (loading) {
    return (
      <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-4">
        <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
        <div className="h-20 bg-neutral-50 rounded-8 w-full animate-pulse" />
      </div>
    );
  }

  if (result?.status === "unavailable") {
    return (
      <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center space-y-3 max-w-lg mx-auto my-6">
        <PhoneCall className="w-6 h-6 text-neutral-400 mx-auto" />
        <h2 className="text-sm font-bold text-accent-black">
          Outbound call records are not available.
        </h2>
        <p className="text-xs text-neutral-500">{result.message}</p>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs text-heat-100 hover:text-heat-200"
        >
          &larr; Back to calls
        </Link>
      </div>
    );
  }

  if (result?.status !== "ready") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-12 p-6 text-center space-y-2 max-w-lg mx-auto">
        <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
        <h2 className="text-sm font-semibold text-red-900">Call Not Found</h2>
        <p className="text-xs text-red-700">{result?.message || "Could not retrieve call records."}</p>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs text-red-800 underline mt-2"
        >
          &larr; Back to calls
        </Link>
      </div>
    );
  }

  const call = result.data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top back link */}
      <div>
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to outbound calls
        </Link>
      </div>

      {/* Main Call Header Card */}
      <div className="bg-white border border-border-faint rounded-12 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-accent-black">
                {call.contactName || "Outbound Call"}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                {call.outcome}
              </span>
            </div>
            <p className="text-xs font-mono text-neutral-500 mt-0.5">
              {call.phone} &middot; ID: {call.id}
            </p>
          </div>
          <div className="text-right sm:text-left">
            <span className="text-xs text-neutral-500 block">Duration</span>
            <span className="text-lg font-bold font-mono text-accent-black">
              {formatDuration(call.durationSeconds)}
            </span>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border-faint text-xs">
          <div>
            <span className="text-neutral-500 block">Campaign</span>
            <span className="font-medium text-accent-black">{call.campaignName}</span>
          </div>
          <div>
            <span className="text-neutral-500 block">Agent</span>
            <span className="font-medium text-accent-black">{call.agentName}</span>
          </div>
          <div>
            <span className="text-neutral-500 block">Started (UTC)</span>
            <span className="font-mono text-neutral-700">
              {formatUtcDateTime(call.startedAt)}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">Status</span>
            <span className="font-medium capitalize text-neutral-800">{call.status}</span>
          </div>
        </div>
      </div>

      {/* Recording Section */}
      <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-accent-black uppercase tracking-wider">
          Call Recording
        </h2>
        <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-8 text-xs text-neutral-500 flex items-center justify-between">
          <span>Audio recording unavailable for this outbound call record.</span>
          <span className="text-[11px] text-neutral-400 font-mono">No carrier signed URL</span>
        </div>
      </div>

      {/* Transcript Section */}
      <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-accent-black uppercase tracking-wider">
          Conversation Transcript
        </h2>

        {call.transcript && call.transcript.length > 0 ? (
          <div className="space-y-3">
            {call.transcript.map((turn, i) => (
              <div
                key={i}
                className={`flex gap-3 text-xs ${
                  turn.speaker === "agent" ? "bg-orange-50/40 p-3 rounded-10 border border-orange-100/60" : "bg-neutral-50 p-3 rounded-10 border border-neutral-100"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {turn.speaker === "agent" ? (
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-heat-100 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-accent-black capitalize">
                      {turn.speaker === "agent" ? call.agentName : (call.contactName || "Contact")}
                    </span>
                    <span className="font-mono text-neutral-400">{turn.timestamp}</span>
                  </div>
                  <p className="text-neutral-700 leading-relaxed">{turn.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-neutral-400">
            No audio transcript captured for this call attempt.
          </div>
        )}
      </div>
    </div>
  );
}
