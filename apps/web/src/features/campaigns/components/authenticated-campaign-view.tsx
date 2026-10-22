"use client";

import { AlertCircle,ArrowLeft,Megaphone } from "lucide-react";
import Link from "next/link";
import { useEffect,useMemo,useState } from "react";
import { getCampaignRepository } from "../lib/repository";
import type { CampaignContact,CampaignDetail,ContactAttempt,RepositoryResult } from "../lib/types";
import { CampaignAttempts } from "./campaign-attempts";
import { CampaignContacts } from "./campaign-contacts";
import { CampaignHeader } from "./campaign-header";
import { CampaignOverview } from "./campaign-overview";
import { ContactAttemptHistory } from "./contact-attempt-history";

interface AuthenticatedCampaignViewProps {
  workspaceId: string;
  campaignId: string;
  tab: "overview" | "contacts" | "attempts";
  contactId?: string;
}

export function AuthenticatedCampaignView({
  workspaceId,
  campaignId,
  tab,
  contactId,
}: AuthenticatedCampaignViewProps) {
  const repo = useMemo(() => getCampaignRepository(false), []);
  const [campaignResult, setCampaignResult] = useState<RepositoryResult<CampaignDetail> | null>(null);
  const [contactsResult, setContactsResult] = useState<RepositoryResult<CampaignContact[]> | null>(null);
  const [attemptsResult, setAttemptsResult] = useState<RepositoryResult<ContactAttempt[]> | null>(null);
  const [loading, setLoading] = useState(true);

  const campaignBaseUrl = `/workspaces/${workspaceId}/campaigns/${campaignId}`;
  const backUrl = `/workspaces/${workspaceId}/campaigns`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    Promise.all([
      repo.getCampaign(workspaceId, campaignId, controller.signal),
      repo.listContacts(workspaceId, campaignId, undefined, controller.signal),
      repo.listAttempts(workspaceId, campaignId, controller.signal),
    ])
      .then(([cRes, contRes, attRes]) => {
        if (!controller.signal.aborted) {
          setCampaignResult(cRes);
          setContactsResult(contRes);
          setAttemptsResult(attRes);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setCampaignResult({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load campaign",
        });
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [repo, workspaceId, campaignId]);

  if (loading) {
    return (
      <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs space-y-4">
        <div className="h-4 bg-neutral-100 rounded-4 w-1/4 animate-pulse" />
        <div className="h-20 bg-neutral-50 rounded-8 w-full animate-pulse" />
      </div>
    );
  }

  // Handle unavailable state
  if (campaignResult?.status === "unavailable") {
    return (
      <div className="space-y-4 max-w-xl mx-auto my-8">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All campaigns
        </Link>
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <Megaphone className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">
            Outbound campaigns are not available yet.
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {campaignResult.message || "This workspace’s campaign service is not connected."}
          </p>
          <div className="pt-2">
            <Link
              href={`/preview/campaigns/${campaignId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
            >
              Explore sample campaign in visual preview &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle error or not found
  if (campaignResult?.status !== "ready") {
    return (
      <div className="space-y-4 max-w-xl mx-auto my-8">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-black"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All campaigns
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-12 p-6 text-center space-y-2">
          <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
          <h2 className="text-sm font-semibold text-red-900">Campaign Unavailable</h2>
          <p className="text-xs text-red-700">{campaignResult?.message || "Could not retrieve campaign."}</p>
        </div>
      </div>
    );
  }

  const campaign = campaignResult.data;
  const contacts = contactsResult?.status === "ready" ? contactsResult.data : [];
  const attempts = attemptsResult?.status === "ready" ? attemptsResult.data : [];

  async function handleLaunch() {
    const res = await repo.launchCampaign(workspaceId, campaignId, campaign.version);
    if (res.status === "ready") {
      setCampaignResult(res);
    }
  }

  async function handlePause() {
    const res = await repo.pauseCampaign(workspaceId, campaignId, campaign.version);
    if (res.status === "ready") {
      setCampaignResult(res);
    }
  }

  async function handleResume() {
    const res = await repo.resumeCampaign(workspaceId, campaignId, campaign.version);
    if (res.status === "ready") {
      setCampaignResult(res);
    }
  }

  async function handleStop() {
    const res = await repo.stopCampaign(workspaceId, campaignId, campaign.version);
    if (res.status === "ready") {
      setCampaignResult(res);
    }
  }

  // Single contact attempt history
  if (tab === "contacts" && contactId) {
    const contact = contacts.find((c) => c.id === contactId);
    const contactAttempts = attempts.filter((a) => a.contactId === contactId);

    if (!contact) {
      return (
        <div className="space-y-4 max-w-xl mx-auto my-8">
          <Link
            href={`${campaignBaseUrl}/contacts`}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-accent-black"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to contacts
          </Link>
          <div className="p-6 bg-white border border-border-faint rounded-12 text-center text-xs text-neutral-500">
            Contact record not found.
          </div>
        </div>
      );
    }

    return (
      <ContactAttemptHistory
        contact={contact}
        attempts={contactAttempts}
        campaignName={campaign.name}
        backUrl={`${campaignBaseUrl}/contacts`}
        workspaceVoiceUrl={`/workspaces/${workspaceId}/voice/outbound`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <CampaignHeader
        campaign={campaign}
        activeTab={tab}
        campaignBaseUrl={campaignBaseUrl}
        backUrl={backUrl}
        isPreview={false}
        onLaunch={handleLaunch}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        exportCsvUrl={repo.getExportCsvUrl(workspaceId, campaignId)}
      />

      {tab === "overview" && (
        <CampaignOverview
          campaign={campaign}
          contacts={contacts}
          campaignBaseUrl={campaignBaseUrl}
        />
      )}

      {tab === "contacts" && (
        <CampaignContacts
          contacts={contacts}
          campaignBaseUrl={campaignBaseUrl}
        />
      )}

      {tab === "attempts" && (
        <CampaignAttempts
          attempts={attempts}
          campaignBaseUrl={campaignBaseUrl}
          workspaceVoiceUrl={`/workspaces/${workspaceId}/voice/outbound`}
        />
      )}
    </div>
  );
}
