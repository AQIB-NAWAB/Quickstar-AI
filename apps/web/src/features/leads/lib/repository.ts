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
    _signal?: AbortSignal
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
    _signal?: AbortSignal
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
    _version?: number
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

export function getLeadsRepository(isPreview = false): LeadsRepository {
  if (isPreview) {
    return leadsPreviewStore;
  }
  return new UnavailableLeadsRepository();
}
