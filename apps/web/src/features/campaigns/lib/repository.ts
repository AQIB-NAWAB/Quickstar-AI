import { campaignPreviewStore } from "./preview-store";
import type {
CampaignContact,
CampaignDetail,
CampaignRepository,
CampaignSummary,
ContactAttempt,
OutboundCall,
RepositoryResult,
WizardDraft,
} from "./types";

export class UnavailableCampaignRepository implements CampaignRepository {
  async listCampaigns(
    _workspaceId: string,
    _filters?: { q?: string; status?: string },
    _signal?: AbortSignal
  ): Promise<RepositoryResult<CampaignSummary[]>> {
    void _workspaceId;
    void _filters;
    void _signal;
    return {
      status: "unavailable",
      message: "This workspace’s campaign service is not connected.",
    };
  }

  async getCampaign(
    _workspaceId: string,
    _campaignId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    void _campaignId;
    void _signal;
    return {
      status: "unavailable",
      message: "Campaign service is not connected.",
    };
  }

  async listContacts(
    _workspaceId: string,
    _campaignId: string,
    _filters?: { q?: string; status?: string },
    _signal?: AbortSignal
  ): Promise<RepositoryResult<CampaignContact[]>> {
    void _workspaceId;
    void _campaignId;
    void _filters;
    void _signal;
    return {
      status: "unavailable",
      message: "Campaign contacts service is not connected.",
    };
  }

  async getContact(
    _workspaceId: string,
    _campaignId: string,
    _contactId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<{ contact: CampaignContact; attempts: ContactAttempt[] }>> {
    void _workspaceId;
    void _campaignId;
    void _contactId;
    void _signal;
    return {
      status: "unavailable",
      message: "Contact attempt history is not available.",
    };
  }

  async listAttempts(
    _workspaceId: string,
    _campaignId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<ContactAttempt[]>> {
    void _workspaceId;
    void _campaignId;
    void _signal;
    return {
      status: "unavailable",
      message: "Campaign attempts are not available.",
    };
  }

  async listOutboundCalls(
    _workspaceId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<OutboundCall[]>> {
    void _workspaceId;
    void _signal;
    return {
      status: "unavailable",
      message: "Outbound call service is not connected.",
    };
  }

  async getOutboundCall(
    _workspaceId: string,
    _callId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<OutboundCall>> {
    void _workspaceId;
    void _callId;
    void _signal;
    return {
      status: "unavailable",
      message: "Outbound call detail is not available.",
    };
  }

  async saveDraft(
    _workspaceId: string,
    _draft: WizardDraft
  ): Promise<RepositoryResult<CampaignSummary>> {
    void _workspaceId;
    void _draft;
    return {
      status: "unavailable",
      message: "Campaign creation is not available yet.",
    };
  }

  async pauseCampaign(
    _workspaceId: string,
    _campaignId: string,
    _version?: number
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    void _campaignId;
    void _version;
    return {
      status: "unavailable",
      message: "Campaign operations are not available.",
    };
  }

  async resumeCampaign(
    _workspaceId: string,
    _campaignId: string,
    _version?: number
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    void _campaignId;
    void _version;
    return {
      status: "unavailable",
      message: "Campaign operations are not available.",
    };
  }

  async stopCampaign(
    _workspaceId: string,
    _campaignId: string,
    _version?: number
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    void _campaignId;
    void _version;
    return {
      status: "unavailable",
      message: "Campaign operations are not available.",
    };
  }
}

export function getCampaignRepository(isPreview = false): CampaignRepository {
  if (isPreview) {
    return campaignPreviewStore;
  }
  return new UnavailableCampaignRepository();
}
