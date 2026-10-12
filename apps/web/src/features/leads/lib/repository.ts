import { getLeadApi, listLeadsApi, updateLeadStatusApi } from "./client";
import { leadsPreviewStore } from "./preview-store";
import type {
  LeadDetail,
  LeadStatus,
  LeadsListResponse,
  LeadsRepository,
  RepositoryResult,
} from "./types";

export class UnavailableLeadsRepository implements LeadsRepository {
  async listLeads(
    _workspaceId: string,
    _filters?: { q?: string; status?: string; tag?: string },
    _signal?: AbortSignal,
  ): Promise<RepositoryResult<LeadsListResponse>> {
    void _workspaceId;
    void _filters;
    void _signal;
    return {
      status: "unavailable",
      message: "This workspace’s lead service is not connected.",
    };
  }

  async getLead(
    _workspaceId: string,
    _leadId: string,
    _signal?: AbortSignal,
  ): Promise<RepositoryResult<LeadDetail>> {
    void _workspaceId;
    void _leadId;
    void _signal;
    return {
      status: "unavailable",
      message: "Lead detail service is not available yet.",
    };
  }

  async updateLeadStatus(
    _workspaceId: string,
    _leadId: string,
    _status: LeadStatus,
    _version?: number,
  ): Promise<RepositoryResult<LeadDetail>> {
    void _workspaceId;
    void _leadId;
    void _status;
    void _version;
    return {
      status: "unavailable",
      message: "Lead mutations are not supported yet.",
    };
  }
}

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
