import { filterLeads } from "./filters";
import { AVAILABLE_SAMPLE_TAGS,SAMPLE_LEADS } from "./fixtures";
import type {
LeadDetail,
LeadStatus,
LeadsListResponse,
LeadsRepository,
RepositoryResult,
} from "./types";

class InMemoryLeadsPreviewStore implements LeadsRepository {
  private leads: Map<string, LeadDetail> = new Map();

  constructor() {
    this.reset();
  }

  reset() {
    this.leads.clear();
    SAMPLE_LEADS.forEach((lead) => {
      this.leads.set(lead.id, JSON.parse(JSON.stringify(lead)));
    });
  }

  async listLeads(
    _workspaceId: string,
    filters?: { q?: string; status?: string; tag?: string },
    _signal?: AbortSignal
  ): Promise<RepositoryResult<LeadsListResponse>> {
    void _workspaceId;
    void _signal;
    const allLeads = Array.from(this.leads.values());
    const filtered = filterLeads(allLeads, filters || {});

    return {
      status: "ready",
      data: {
        leads: filtered,
        total: allLeads.length,
        availableTags: AVAILABLE_SAMPLE_TAGS,
      },
    };
  }

  async getLead(
    _workspaceId: string,
    leadId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<LeadDetail>> {
    void _workspaceId;
    void _signal;
    const lead = this.leads.get(leadId);
    if (!lead) {
      return { status: "not_found", message: `Lead "${leadId}" was not found.` };
    }
    return {
      status: "ready",
      data: JSON.parse(JSON.stringify(lead)),
    };
  }

  async updateLeadStatus(
    _workspaceId: string,
    leadId: string,
    status: LeadStatus,
    version?: number
  ): Promise<RepositoryResult<LeadDetail>> {
    void _workspaceId;
    const lead = this.leads.get(leadId);
    if (!lead) {
      return { status: "not_found", message: `Lead "${leadId}" was not found.` };
    }

    if (version !== undefined && lead.version !== undefined && lead.version !== version) {
      return {
        status: "error",
        message: "Concurrency conflict: Lead was updated elsewhere. Please refresh.",
      };
    }

    lead.status = status;
    lead.version = (lead.version ?? 0) + 1;
    this.leads.set(leadId, lead);

    return {
      status: "ready",
      data: JSON.parse(JSON.stringify(lead)),
    };
  }
}

export const leadsPreviewStore = new InMemoryLeadsPreviewStore();
