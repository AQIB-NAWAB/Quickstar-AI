import {
  deleteCampaignApi,
  getCampaignApi,
  getContactApi,
  getDirectorySummaryApi,
  getExportCsvUrl,
  launchCampaignApi,
  listAttemptsApi,
  listCampaignsApi,
  listContactsApi,
  pauseCampaignApi,
  resumeCampaignApi,
  saveDraftApi,
  stopCampaignApi,
  updateDraftApi,
} from "./client";
import { campaignPreviewStore } from "./preview-store";
import type { CampaignRepository } from "./types";

/** Stable singleton — a new object every render would retrigger useEffect([repo]) forever. */
const productionCampaignRepository: CampaignRepository = {
  getDirectorySummary(workspaceId, signal) {
    return getDirectorySummaryApi(workspaceId, signal);
  },
  listCampaigns(workspaceId, filters, signal) {
    return listCampaignsApi(workspaceId, filters, signal);
  },
  getCampaign(workspaceId, campaignId, signal) {
    return getCampaignApi(workspaceId, campaignId, signal);
  },
  listContacts(workspaceId, campaignId, filters, signal) {
    return listContactsApi(workspaceId, campaignId, filters, signal);
  },
  getContact(workspaceId, campaignId, contactId, signal) {
    return getContactApi(workspaceId, campaignId, contactId, signal);
  },
  listAttempts(workspaceId, campaignId, signal) {
    return listAttemptsApi(workspaceId, campaignId, signal);
  },
  async listOutboundCalls() {
    return {
      status: "unavailable",
      message: "Outbound call log requires voice-service (Feature 21C).",
    };
  },
  async getOutboundCall() {
    return {
      status: "unavailable",
      message: "Outbound call detail requires voice-service (Feature 21C).",
    };
  },
  saveDraft(workspaceId, draft) {
    return saveDraftApi(workspaceId, draft);
  },
  updateDraft(workspaceId, campaignId, draft, version) {
    return updateDraftApi(workspaceId, campaignId, draft, version);
  },
  deleteCampaign(workspaceId, campaignId) {
    return deleteCampaignApi(workspaceId, campaignId);
  },
  launchCampaign(workspaceId, campaignId, version) {
    return launchCampaignApi(workspaceId, campaignId, version);
  },
  pauseCampaign(workspaceId, campaignId, version) {
    return pauseCampaignApi(workspaceId, campaignId, version);
  },
  resumeCampaign(workspaceId, campaignId, version) {
    return resumeCampaignApi(workspaceId, campaignId, version);
  },
  stopCampaign(workspaceId, campaignId, version) {
    return stopCampaignApi(workspaceId, campaignId, version);
  },
  getExportCsvUrl(workspaceId, campaignId) {
    return getExportCsvUrl(workspaceId, campaignId);
  },
};

export function getCampaignRepository(isPreview = false): CampaignRepository {
  if (isPreview) {
    return campaignPreviewStore;
  }
  return productionCampaignRepository;
}
