import {
SAMPLE_ATTEMPTS,
SAMPLE_CAMPAIGNS,
SAMPLE_CONTACTS,
SAMPLE_OUTBOUND_CALLS,
} from "./fixtures";
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

class InMemoryCampaignPreviewStore implements CampaignRepository {
  private campaigns: Map<string, CampaignDetail> = new Map();
  private contacts: Map<string, CampaignContact[]> = new Map();
  private attempts: Map<string, ContactAttempt[]> = new Map();
  private outboundCalls: Map<string, OutboundCall> = new Map();

  constructor() {
    this.reset();
  }

  reset() {
    this.campaigns.clear();
    this.contacts.clear();
    this.attempts.clear();
    this.outboundCalls.clear();

    SAMPLE_CAMPAIGNS.forEach((c) => {
      this.campaigns.set(c.id, JSON.parse(JSON.stringify(c)));
    });

    this.contacts.set(
      "product-demo-follow-up",
      JSON.parse(JSON.stringify(SAMPLE_CONTACTS))
    );

    this.attempts.set(
      "product-demo-follow-up",
      JSON.parse(JSON.stringify(SAMPLE_ATTEMPTS))
    );

    SAMPLE_OUTBOUND_CALLS.forEach((call) => {
      this.outboundCalls.set(call.id, JSON.parse(JSON.stringify(call)));
    });
  }

  async listCampaigns(
    _workspaceId: string,
    filters?: { q?: string; status?: string },
    _signal?: AbortSignal
  ): Promise<RepositoryResult<CampaignSummary[]>> {
    void _workspaceId;
    void _signal;
    let list = Array.from(this.campaigns.values());

    if (filters?.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (filters?.status && filters.status !== "all") {
      list = list.filter((c) => c.status === filters.status);
    }

    const summaries: CampaignSummary[] = list.map((c) => ({
      id: c.id,
      workspaceId: c.workspaceId,
      name: c.name,
      description: c.description,
      agentId: c.agentId,
      agentName: c.agentName,
      status: c.status,
      eligibleContacts: c.eligibleContacts,
      completedContacts: c.completedContacts,
      answerRate: c.answerRate,
      scheduledStart: c.scheduledStart,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      version: c.version,
    }));

    return { status: "ready", data: summaries };
  }

  async getCampaign(
    _workspaceId: string,
    campaignId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    void _signal;
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { status: "not_found", message: `Campaign "${campaignId}" not found.` };
    }
    return { status: "ready", data: JSON.parse(JSON.stringify(campaign)) };
  }

  async listContacts(
    _workspaceId: string,
    campaignId: string,
    filters?: { q?: string; status?: string },
    _signal?: AbortSignal
  ): Promise<RepositoryResult<CampaignContact[]>> {
    void _workspaceId;
    void _signal;
    let list = this.contacts.get(campaignId) || [];

    if (filters?.q?.trim()) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          c.phone.toLowerCase().includes(q)
      );
    }
    if (filters?.status && filters.status !== "all") {
      list = list.filter((c) => c.status === filters.status);
    }

    return { status: "ready", data: JSON.parse(JSON.stringify(list)) };
  }

  async getContact(
    _workspaceId: string,
    campaignId: string,
    contactId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<{ contact: CampaignContact; attempts: ContactAttempt[] }>> {
    void _workspaceId;
    void _signal;
    const list = this.contacts.get(campaignId) || [];
    const contact = list.find((c) => c.id === contactId);
    if (!contact) {
      return { status: "not_found", message: `Contact "${contactId}" not found.` };
    }

    const allAttempts = this.attempts.get(campaignId) || [];
    const contactAttempts = allAttempts.filter((a) => a.contactId === contactId);

    return {
      status: "ready",
      data: {
        contact: JSON.parse(JSON.stringify(contact)),
        attempts: JSON.parse(JSON.stringify(contactAttempts)),
      },
    };
  }

  async listAttempts(
    _workspaceId: string,
    campaignId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<ContactAttempt[]>> {
    void _workspaceId;
    void _signal;
    const list = this.attempts.get(campaignId) || [];
    return { status: "ready", data: JSON.parse(JSON.stringify(list)) };
  }

  async listOutboundCalls(
    _workspaceId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<OutboundCall[]>> {
    void _workspaceId;
    void _signal;
    const list = Array.from(this.outboundCalls.values());
    return { status: "ready", data: JSON.parse(JSON.stringify(list)) };
  }

  async getOutboundCall(
    _workspaceId: string,
    callId: string,
    _signal?: AbortSignal
  ): Promise<RepositoryResult<OutboundCall>> {
    void _workspaceId;
    void _signal;
    const call = this.outboundCalls.get(callId);
    if (!call) {
      return { status: "not_found", message: `Call "${callId}" not found.` };
    }
    return { status: "ready", data: JSON.parse(JSON.stringify(call)) };
  }

  async saveDraft(
    workspaceId: string,
    draft: WizardDraft
  ): Promise<RepositoryResult<CampaignSummary>> {
    const id = `campaign-${Date.now()}`;
    const newCampaign: CampaignDetail = {
      id,
      workspaceId,
      name: draft.name,
      description: draft.description || null,
      agentId: draft.agentId,
      agentName: draft.agentName,
      status: "draft",
      eligibleContacts: draft.validCount,
      completedContacts: 0,
      answerRate: null,
      scheduledStart: `${draft.schedule.startDate}T${draft.schedule.startTime}:00.000Z`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      audienceSchema: draft.columnMappings.map((m) => ({
        key: m.key,
        label: m.sourceColumn,
        role: m.role,
        sourceColumn: m.sourceColumn,
        required: m.role === "dial",
      })),
      schedule: draft.schedule,
      pacing: draft.pacing,
      retryPolicy: draft.retryPolicy,
      metrics: {
        eligibleContacts: draft.validCount,
        completedContacts: 0,
        answeredContacts: 0,
        answerRate: 0,
        avgAnsweredDurationSeconds: 0,
        activeCalls: 0,
        queuedContacts: draft.validCount,
        retryingContacts: 0,
        startedAttempts: 0,
      },
      activityBuckets: [],
    };

    this.campaigns.set(id, newCampaign);

    return {
      status: "ready",
      data: {
        id: newCampaign.id,
        workspaceId: newCampaign.workspaceId,
        name: newCampaign.name,
        description: newCampaign.description,
        agentId: newCampaign.agentId,
        agentName: newCampaign.agentName,
        status: newCampaign.status,
        eligibleContacts: newCampaign.eligibleContacts,
        completedContacts: newCampaign.completedContacts,
        answerRate: newCampaign.answerRate,
        scheduledStart: newCampaign.scheduledStart,
        createdAt: newCampaign.createdAt,
        updatedAt: newCampaign.updatedAt,
        version: newCampaign.version,
      },
    };
  }

  async pauseCampaign(
    _workspaceId: string,
    campaignId: string,
    version?: number
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { status: "not_found", message: "Campaign not found" };
    }
    if (version !== undefined && campaign.version !== undefined && campaign.version !== version) {
      return { status: "conflict", message: "Campaign was updated elsewhere." };
    }

    campaign.status = "paused";
    campaign.version = (campaign.version ?? 0) + 1;
    this.campaigns.set(campaignId, campaign);
    return { status: "ready", data: JSON.parse(JSON.stringify(campaign)) };
  }

  async resumeCampaign(
    _workspaceId: string,
    campaignId: string,
    version?: number
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { status: "not_found", message: "Campaign not found" };
    }
    if (version !== undefined && campaign.version !== undefined && campaign.version !== version) {
      return { status: "conflict", message: "Campaign was updated elsewhere." };
    }

    campaign.status = "running";
    campaign.version = (campaign.version ?? 0) + 1;
    this.campaigns.set(campaignId, campaign);
    return { status: "ready", data: JSON.parse(JSON.stringify(campaign)) };
  }

  async stopCampaign(
    _workspaceId: string,
    campaignId: string,
    version?: number
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { status: "not_found", message: "Campaign not found" };
    }
    if (version !== undefined && campaign.version !== undefined && campaign.version !== version) {
      return { status: "conflict", message: "Campaign was updated elsewhere." };
    }

    campaign.status = "completed";
    campaign.metrics.activeCalls = 0;
    campaign.version = (campaign.version ?? 0) + 1;
    this.campaigns.set(campaignId, campaign);
    return { status: "ready", data: JSON.parse(JSON.stringify(campaign)) };
  }

  async launchCampaign(
    _workspaceId: string,
    campaignId: string,
    version?: number,
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { status: "not_found", message: "Campaign not found" };
    }
    if (version !== undefined && campaign.version !== undefined && campaign.version !== version) {
      return { status: "conflict", message: "Campaign was updated elsewhere." };
    }
    campaign.status = "running";
    campaign.version = (campaign.version ?? 0) + 1;
    this.campaigns.set(campaignId, campaign);
    return { status: "ready", data: JSON.parse(JSON.stringify(campaign)) };
  }

  async updateDraft(
    _workspaceId: string,
    campaignId: string,
    draft: Partial<WizardDraft>,
    version?: number,
  ): Promise<RepositoryResult<CampaignDetail>> {
    void _workspaceId;
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      return { status: "not_found", message: "Campaign not found" };
    }
    if (version !== undefined && campaign.version !== undefined && campaign.version !== version) {
      return { status: "conflict", message: "Campaign was updated elsewhere." };
    }
    if (draft.name) campaign.name = draft.name;
    if (draft.description !== undefined) campaign.description = draft.description;
    if (draft.agentId) campaign.agentId = draft.agentId;
    if (draft.agentName) campaign.agentName = draft.agentName;
    if (draft.schedule) campaign.schedule = { ...campaign.schedule, ...draft.schedule };
    if (draft.pacing) campaign.pacing = { ...campaign.pacing, ...draft.pacing };
    if (draft.retryPolicy) campaign.retryPolicy = { ...campaign.retryPolicy, ...draft.retryPolicy };
    campaign.version = (campaign.version ?? 0) + 1;
    this.campaigns.set(campaignId, campaign);
    return { status: "ready", data: JSON.parse(JSON.stringify(campaign)) };
  }

  async deleteCampaign(
    _workspaceId: string,
    campaignId: string,
  ): Promise<RepositoryResult<void>> {
    void _workspaceId;
    this.campaigns.delete(campaignId);
    return { status: "ready", data: undefined };
  }

  async getDirectorySummary(
    _workspaceId: string,
    _signal?: AbortSignal,
  ): Promise<RepositoryResult<import("./types").CampaignsDirectorySummary>> {
    void _workspaceId;
    void _signal;
    const all = Array.from(this.campaigns.values());
    const active = all.filter((c) => c.status === "running").length;
    const scheduled = all.filter((c) => c.status === "scheduled").length;
    const paused = all.filter((c) => c.status === "paused").length;
    const completed = all.filter((c) => c.status === "completed").length;
    const totalContacts = all.reduce((sum, c) => sum + (c.eligibleContacts || 0), 0);
    const activeCalls = all.reduce((sum, c) => sum + (c.metrics?.activeCalls || 0), 0);
    return {
      status: "ready",
      data: {
        totalCampaigns: all.length,
        activeCampaigns: active,
        scheduledCampaigns: scheduled,
        pausedCampaigns: paused,
        completedCampaigns: completed,
        totalContacts,
        overallAnswerRate: 68,
        activeCallsCount: activeCalls,
        workspaceCapacity: 20,
        retryConversionRate: 42,
      },
    };
  }

  getExportCsvUrl(workspaceId: string, campaignId: string): string {
    return `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}/export`;
  }
}

export const campaignPreviewStore = new InMemoryCampaignPreviewStore();
