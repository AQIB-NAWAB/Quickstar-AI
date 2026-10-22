import { getLeadApi, listLeadsApi, updateLeadStatusApi } from "./client";
import { leadsPreviewStore } from "./preview-store";
import type { LeadsRepository } from "./types";

/** Stable singleton — avoids useEffect([repo]) request loops. */
const productionLeadsRepository: LeadsRepository = {
  listLeads(workspaceId, filters, signal) {
    return listLeadsApi(workspaceId, filters, signal);
  },
  getLead(workspaceId, leadId, signal) {
    return getLeadApi(workspaceId, leadId, signal);
  },
  updateLeadStatus(workspaceId, leadId, status, version) {
    return updateLeadStatusApi(workspaceId, leadId, status, version);
  },
};

export function getLeadsRepository(isPreview = false): LeadsRepository {
  if (isPreview) {
    return leadsPreviewStore;
  }
  return productionLeadsRepository;
}
