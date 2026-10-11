"use client";

import { AlertCircle,ArrowLeft,Phone } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";
import { getVoiceRepository } from "../lib/repository";
import type { InboundCallDetail,RepositoryResult } from "../lib/types";
import { CallDetailView } from "./call-detail/call-detail-view";

interface AuthenticatedCallDetailViewProps {
  workspaceId: string;
  callId: string;
}

export function AuthenticatedCallDetailView({
  workspaceId,
  callId,
}: AuthenticatedCallDetailViewProps) {
  const repo = getVoiceRepository(false);
  const [result, setResult] = useState<RepositoryResult<InboundCallDetail> | null>(null);
  const [loading, setLoading] = useState(true);

  const backUrl = `/workspaces/${workspaceId}/voice/inbound`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    repo
      .getInboundCall(workspaceId, callId)
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
      <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-4 max-w-5xl mx-auto">
        <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
        <div className="h-24 bg-neutral-50 rounded-8 w-full animate-pulse" />
      </div>
    );
  }

  if (result?.status === "unavailable") {
    return (
      <div className="space-y-4 max-w-xl mx-auto my-8">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Inbound call logs
        </Link>
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <Phone className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">
            Call detail records are not available yet.
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {result.message || "This workspace’s voice service is not connected."}
          </p>
          <div className="pt-2">
            <Link
              href={`/preview/voice/inbound/${callId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
            >
              Explore sample call detail in visual preview &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (result?.status !== "ready") {
    return (
      <div className="space-y-4 max-w-xl mx-auto my-8">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-black"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Inbound call logs
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-12 p-6 text-center space-y-2">
          <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
          <h2 className="text-sm font-semibold text-red-900">Call Not Found</h2>
          <p className="text-xs text-red-700">{result?.message || "Could not retrieve call records."}</p>
        </div>
      </div>
    );
  }

  return (
    <CallDetailView
      call={result.data}
      workspaceId={workspaceId}
      isPreview={false}
      baseInboundUrl={backUrl}
    />
  );
}
