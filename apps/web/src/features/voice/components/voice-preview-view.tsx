"use client";

import { OutboundCallDetail } from "@/features/campaigns/components/outbound-call-detail";
import { OutboundCallsList } from "@/features/campaigns/components/outbound-calls-list";
import { campaignPreviewStore } from "@/features/campaigns/lib/preview-store";
import { useEffect,useState } from "react";
import { voicePreviewStore } from "../lib/preview-store";
import type { InboundCallDetail } from "../lib/types";
import { CallDetailView } from "./call-detail/call-detail-view";
import { InboundCallLogs } from "./inbound-call-logs";
import { LiveInboundDashboard } from "./live-inbound-dashboard";

interface VoicePreviewViewProps {
  view: string[]; // e.g. ["voice", "inbound"], ["voice", "inbound", "live"], ["voice", "inbound", "call_1042"], ["voice", "outbound"], etc.
}

export function VoicePreviewView({ view }: VoicePreviewViewProps) {
  const [detailCall, setDetailCall] = useState<InboundCallDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Parse view routes:
  // view[0] === "voice"
  // view[1]: "inbound" | "outbound" | undefined
  const subSection = view[1] || "inbound";
  const subTarget = view[2]; // e.g. "live" | "call_1042" | undefined

  const isLive = subSection === "inbound" && subTarget === "live";
  const isInboundDetail = subSection === "inbound" && subTarget && subTarget !== "live";
  const isOutbound = subSection === "outbound";
  const isOutboundDetail = isOutbound && Boolean(subTarget);

  useEffect(() => {
    if (isInboundDetail && subTarget) {
      setLoading(true);
      voicePreviewStore.getInboundCall("local-preview", subTarget).then((res) => {
        if (res.status === "ready") {
          setDetailCall(res.data);
        }
        setLoading(false);
      });
    }
  }, [isInboundDetail, subTarget]);

  // Outbound routes
  if (isOutbound) {
    if (isOutboundDetail && subTarget) {
      return (
        <OutboundCallDetail
          workspaceId="local-preview"
          callId={subTarget}
          isPreview={true}
          repository={campaignPreviewStore}
          baseBackUrl="/preview/voice/outbound"
        />
      );
    }
    return (
      <OutboundCallsList
        workspaceId="local-preview"
        isPreview={true}
        repository={campaignPreviewStore}
        baseRoute="/preview/voice/outbound"
      />
    );
  }

  // Live Inbound Dashboard
  if (isLive) {
    return (
      <LiveInboundDashboard
        workspaceId="local-preview"
        isPreview={true}
        repository={voicePreviewStore}
        baseInboundUrl="/preview/voice/inbound"
      />
    );
  }

  // Inbound Call Detail
  if (isInboundDetail) {
    if (loading || !detailCall) {
      return (
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-4 max-w-5xl mx-auto">
          <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
          <div className="h-24 bg-neutral-50 rounded-8 w-full animate-pulse" />
        </div>
      );
    }
    return (
      <CallDetailView
        call={detailCall}
        workspaceId="local-preview"
        isPreview={true}
        baseInboundUrl="/preview/voice/inbound"
      />
    );
  }

  // Default Inbound Call Logs
  return (
    <InboundCallLogs
      workspaceId="local-preview"
      isPreview={true}
      repository={voicePreviewStore}
      baseInboundUrl="/preview/voice/inbound"
    />
  );
}
