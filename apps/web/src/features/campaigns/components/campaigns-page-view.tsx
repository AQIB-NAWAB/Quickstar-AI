"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Megaphone } from "lucide-react";
import { CampaignList } from "@/features/campaigns/components/campaign-list";
import { EmailCampaignsPanel } from "@/features/email-campaigns/components/email-campaigns-panel";

type CampaignChannel = "voice" | "email";

interface CampaignsPageViewProps {
  workspaceId: string;
  initialChannel: CampaignChannel;
}

export function CampaignsPageView({ workspaceId, initialChannel }: CampaignsPageViewProps) {
  const router = useRouter();
  const [channel, setChannel] = useState<CampaignChannel>(initialChannel);

  function switchChannel(next: CampaignChannel) {
    setChannel(next);
    const url = new URL(window.location.href);
    if (next === "email") url.searchParams.set("channel", "email");
    else url.searchParams.delete("channel");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }

  return (
    <div className="w-full">
      <div className="mx-auto mb-5 flex max-w-7xl items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Campaign channel"
          className="inline-flex items-center rounded-10 border border-border-faint bg-white p-1 shadow-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={channel === "voice"}
            onClick={() => switchChannel("voice")}
            className={`inline-flex items-center gap-1.5 rounded-8 px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              channel === "voice"
                ? "bg-heat-100 text-white shadow-xs"
                : "text-neutral-600 hover:text-accent-black"
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Voice campaigns
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={channel === "email"}
            onClick={() => switchChannel("email")}
            className={`inline-flex items-center gap-1.5 rounded-8 px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              channel === "email"
                ? "bg-heat-100 text-white shadow-xs"
                : "text-neutral-600 hover:text-accent-black"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email campaigns
          </button>
        </div>
      </div>

      {channel === "voice" ? (
        <CampaignList key={`voice-${workspaceId}`} workspaceId={workspaceId} isPreview={false} />
      ) : (
        <EmailCampaignsPanel key={`email-${workspaceId}`} workspaceId={workspaceId} />
      )}
    </div>
  );
}
