"use client";

import { useEffect,useState } from "react";
import { campaignPreviewStore } from "../lib/preview-store";
import type { CampaignContact,CampaignDetail,ContactAttempt } from "../lib/types";
import { CampaignAttempts } from "./campaign-attempts";
import { CampaignContacts } from "./campaign-contacts";
import { CampaignHeader } from "./campaign-header";
import { CampaignList } from "./campaign-list";
import { CampaignOverview } from "./campaign-overview";
import { ContactAttemptHistory } from "./contact-attempt-history";
import { OutboundCallDetail } from "./outbound-call-detail";
import { OutboundCallsList } from "./outbound-calls-list";
import { CampaignWizard } from "./wizard/campaign-wizard";

interface CampaignPreviewViewProps {
  view: string[];
}

export function CampaignPreviewView({ view }: CampaignPreviewViewProps) {
  const [activeCampaign, setActiveCampaign] = useState<CampaignDetail | null>(null);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [attempts, setAttempts] = useState<ContactAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  // Parse view routes:
  // e.g. ["campaigns"] -> List
  // ["campaigns", "new"] -> Wizard
  // ["campaigns", "product-demo-follow-up"] -> Overview
  // ["campaigns", "product-demo-follow-up", "contacts"] -> Contacts
  // ["campaigns", "product-demo-follow-up", "contacts", "c_1042"] -> Contact Attempt History
  // ["campaigns", "product-demo-follow-up", "attempts"] -> Attempts
  // ["voice", "outbound"] -> Outbound list
  // ["voice", "outbound", "call_out_1042"] -> Outbound call detail

  const isVoiceOutbound = view[0] === "voice" && view[1] === "outbound";
  const voiceCallId = isVoiceOutbound ? view[2] : null;

  const isCampaigns = view[0] === "campaigns";
  const campaignSubRoute = isCampaigns ? view[1] : null;
  const isNew = campaignSubRoute === "new";
  const campaignId = campaignSubRoute && campaignSubRoute !== "new" ? campaignSubRoute : null;
  const tabOrContacts = view[2]; // "contacts" | "attempts" | undefined
  const contactId = tabOrContacts === "contacts" ? view[3] : null;

  async function refreshCampaign(id: string) {
    setLoading(true);
    const cRes = await campaignPreviewStore.getCampaign("local-preview", id);
    if (cRes.status === "ready") {
      setActiveCampaign(cRes.data);
    }
    const contRes = await campaignPreviewStore.listContacts("local-preview", id);
    if (contRes.status === "ready") {
      setContacts(contRes.data);
    }
    const attRes = await campaignPreviewStore.listAttempts("local-preview", id);
    if (attRes.status === "ready") {
      setAttempts(attRes.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (campaignId) {
      refreshCampaign(campaignId);
    }
  }, [campaignId]);

  // Voice Outbound Preview
  if (isVoiceOutbound) {
    if (voiceCallId) {
      return (
        <OutboundCallDetail
          workspaceId="local-preview"
          callId={voiceCallId}
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

  // Campaign List
  if (!campaignSubRoute) {
    return (
      <CampaignList
        workspaceId="local-preview"
        isPreview={true}
        repository={campaignPreviewStore}
        baseRoute="/preview/campaigns"
      />
    );
  }

  // Campaign Wizard
  if (isNew) {
    return (
      <CampaignWizard
        workspaceId="local-preview"
        isPreview={true}
        repository={campaignPreviewStore}
        baseBackUrl="/preview/campaigns"
      />
    );
  }

  // If loading campaign detail
  if (loading || !activeCampaign) {
    return (
      <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-4">
        <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
        <div className="h-20 bg-neutral-50 rounded-8 w-full animate-pulse" />
      </div>
    );
  }

  const campaignBaseUrl = `/preview/campaigns/${campaignId}`;

  // Contact Attempt History detail page
  if (tabOrContacts === "contacts" && contactId) {
    const contact = contacts.find((c) => c.id === contactId);
    const contactAttempts = attempts.filter((a) => a.contactId === contactId);

    if (!contact) {
      return (
        <div className="p-6 bg-white border border-border-faint rounded-12 text-center text-xs text-neutral-500">
          Contact {contactId} not found.
        </div>
      );
    }

    return (
      <ContactAttemptHistory
        contact={contact}
        attempts={contactAttempts}
        campaignName={activeCampaign.name}
        backUrl={`${campaignBaseUrl}/contacts`}
        workspaceVoiceUrl="/preview/voice/outbound"
      />
    );
  }

  // Main Campaign Detail Tabs View
  const activeTab: "overview" | "contacts" | "attempts" =
    tabOrContacts === "contacts"
      ? "contacts"
      : tabOrContacts === "attempts"
      ? "attempts"
      : "overview";

  return (
    <div className="space-y-6">
      <CampaignHeader
        campaign={activeCampaign}
        activeTab={activeTab}
        campaignBaseUrl={campaignBaseUrl}
        backUrl="/preview/campaigns"
        isPreview={true}
        onLaunch={async () => {
          await campaignPreviewStore.launchCampaign("local-preview", activeCampaign.id, activeCampaign.version);
          await refreshCampaign(activeCampaign.id);
        }}
        onPause={async () => {
          await campaignPreviewStore.pauseCampaign("local-preview", activeCampaign.id, activeCampaign.version);
          await refreshCampaign(activeCampaign.id);
        }}
        onResume={async () => {
          await campaignPreviewStore.resumeCampaign("local-preview", activeCampaign.id, activeCampaign.version);
          await refreshCampaign(activeCampaign.id);
        }}
        onStop={async () => {
          await campaignPreviewStore.stopCampaign("local-preview", activeCampaign.id, activeCampaign.version);
          await refreshCampaign(activeCampaign.id);
        }}
      />

      {activeTab === "overview" && (
        <CampaignOverview
          campaign={activeCampaign}
          contacts={contacts}
          campaignBaseUrl={campaignBaseUrl}
        />
      )}

      {activeTab === "contacts" && (
        <CampaignContacts
          contacts={contacts}
          campaignBaseUrl={campaignBaseUrl}
        />
      )}

      {activeTab === "attempts" && (
        <CampaignAttempts
          attempts={attempts}
          campaignBaseUrl={campaignBaseUrl}
          workspaceVoiceUrl="/preview/voice/outbound"
        />
      )}
    </div>
  );
}
