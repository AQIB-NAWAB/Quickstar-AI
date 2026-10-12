import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  AudienceFieldDef,
  CampaignAttempt,
  CampaignDetail,
  CampaignPacing,
  CampaignRecord,
  CampaignRetryPolicy,
  CampaignSchedule,
  CampaignStatus,
  CampaignSummary,
  CampaignTarget,
  IncomingTarget,
} from "../domain/types.js";
import type { CampaignsRepository } from "../repository/campaigns.repository.js";
import {
  assertAudienceSchemaHasDial,
  normalizeAudienceSchema,
  normalizeIncomingTargets,
} from "../utils/audience.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TERMINAL_FOR_CONTROL = new Set<CampaignStatus>(["completed", "failed"]);

function defaultSchedule(): CampaignSchedule {
  const today = new Date().toISOString().slice(0, 10);
  return {
    startDate: today,
    startTime: "09:00",
    timezone: "UTC",
    dailyWindowFrom: "09:00",
    dailyWindowTo: "17:00",
  };
}

function defaultRetry(): CampaignRetryPolicy {
  return {
    maxRetries: 2,
    retryIntervalMinutes: 30,
    eligibleOutcomes: ["no_answer", "busy"],
  };
}

export class CampaignsService {
  constructor(
    private readonly repo: CampaignsRepository,
    private readonly limits: {
      maxTargetsPerImport: number;
      maxAttributeKeys: number;
      maxAttributeValueLength: number;
      defaultMaxConcurrentCalls: number;
      defaultMaxStartsPerMinute: number;
    },
  ) {}

  list(workspaceId: string, filters?: { q?: string; status?: string }): Promise<CampaignSummary[]> {
    return this.repo.list(workspaceId, filters);
  }

  async getDetail(workspaceId: string, campaignId: string): Promise<CampaignDetail> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    const metrics = await this.repo.metrics(workspaceId, campaignId);
    return toDetail(campaign, metrics);
  }

  async create(
    workspaceId: string,
    body: {
      name?: string;
      description?: string | null;
      agent_id?: string;
      agent_name?: string;
      audience_schema?: unknown;
      schedule?: Partial<CampaignSchedule>;
      pacing?: Partial<CampaignPacing>;
      retry_policy?: Partial<CampaignRetryPolicy>;
      idempotency_key?: string | null;
      targets?: IncomingTarget[];
      status?: CampaignStatus;
    },
  ): Promise<CampaignDetail> {
    const name = body.name?.trim();
    if (!name) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "name is required" });
    }
    const agentId = body.agent_id?.trim();
    if (!agentId || !UUID_RE.test(agentId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "agent_id must be a valid UUID",
      });
    }

    if (body.idempotency_key) {
      const existing = await this.repo.getByIdempotencyKey(workspaceId, body.idempotency_key);
      if (existing) {
        return this.getDetail(workspaceId, existing.id);
      }
    }

    let audienceSchema = normalizeAudienceSchema(body.audience_schema);
    if (audienceSchema.length === 0) {
      audienceSchema = [
        { key: "phone", label: "Phone", role: "dial", required: true },
        { key: "name", label: "Name", role: "identity" },
        { key: "email", label: "Email", role: "contact_email" },
      ];
    }
    assertAudienceSchemaHasDial(audienceSchema);

    const schedule = { ...defaultSchedule(), ...(body.schedule ?? {}) };
    const pacing: CampaignPacing = {
      maxConcurrentCalls:
        body.pacing?.maxConcurrentCalls ?? this.limits.defaultMaxConcurrentCalls,
      maxCallStartsPerMinute:
        body.pacing?.maxCallStartsPerMinute ?? this.limits.defaultMaxStartsPerMinute,
    };
    const retryPolicy = { ...defaultRetry(), ...(body.retry_policy ?? {}) };

    const status: CampaignStatus = body.status === "scheduled" ? "scheduled" : "draft";
    const scheduledStart = parseScheduledStart(schedule);

    const campaign = await this.repo.create({
      workspaceId,
      name,
      description: body.description ?? null,
      agentId,
      agentName: body.agent_name?.trim() || "Agent",
      status,
      audienceSchema,
      schedule,
      pacing,
      retryPolicy,
      idempotencyKey: body.idempotency_key ?? null,
      scheduledStart,
    });

    if (body.targets?.length) {
      await this.importTargets(workspaceId, campaign.id, body.targets, audienceSchema);
    }

    return this.getDetail(workspaceId, campaign.id);
  }

  async importTargets(
    workspaceId: string,
    campaignId: string,
    targets: IncomingTarget[],
    schema?: AudienceFieldDef[],
  ): Promise<{ inserted: number; invalidCount: number; duplicateCount: number }> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    if (campaign.status === "completed" || campaign.status === "failed") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Cannot import targets into a finished campaign",
      });
    }
    if (targets.length > this.limits.maxTargetsPerImport) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `At most ${this.limits.maxTargetsPerImport} targets per import`,
      });
    }

    if (schema?.length) {
      assertAudienceSchemaHasDial(schema);
    }

    const normalized = normalizeIncomingTargets(targets, {
      maxKeys: this.limits.maxAttributeKeys,
      maxValueLength: this.limits.maxAttributeValueLength,
    });
    const inserted = await this.repo.insertTargets(workspaceId, campaignId, normalized.valid);
    return {
      inserted,
      invalidCount: normalized.invalidCount,
      duplicateCount: normalized.duplicateCount + (normalized.valid.length - inserted),
    };
  }

  async launch(workspaceId: string, campaignId: string, expectedVersion?: number): Promise<CampaignDetail> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    this.assertVersion(campaign, expectedVersion);
    if (!["draft", "scheduled", "paused"].includes(campaign.status)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Cannot launch campaign in status ${campaign.status}`,
      });
    }
    const count = await this.repo.countTargets(workspaceId, campaignId);
    if (count === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Campaign requires at least one target",
      });
    }
    await this.repo.updateStatus(workspaceId, campaignId, campaign.version, {
      status: "running",
      startedAt: campaign.startedAt ?? new Date(),
    });
    return this.getDetail(workspaceId, campaignId);
  }

  async pause(workspaceId: string, campaignId: string, expectedVersion?: number): Promise<CampaignDetail> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    this.assertVersion(campaign, expectedVersion);
    if (campaign.status !== "running") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Only running campaigns can be paused",
      });
    }
    await this.repo.updateStatus(workspaceId, campaignId, campaign.version, { status: "paused" });
    return this.getDetail(workspaceId, campaignId);
  }

  async resume(workspaceId: string, campaignId: string, expectedVersion?: number): Promise<CampaignDetail> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    this.assertVersion(campaign, expectedVersion);
    if (campaign.status !== "paused") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Only paused campaigns can be resumed",
      });
    }
    await this.repo.updateStatus(workspaceId, campaignId, campaign.version, { status: "running" });
    return this.getDetail(workspaceId, campaignId);
  }

  async stop(workspaceId: string, campaignId: string, expectedVersion?: number): Promise<CampaignDetail> {
    const campaign = await this.requireCampaign(workspaceId, campaignId);
    this.assertVersion(campaign, expectedVersion);
    if (TERMINAL_FOR_CONTROL.has(campaign.status)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Campaign is already finished",
      });
    }
    await this.repo.updateStatus(workspaceId, campaignId, campaign.version, {
      status: "completed",
      completedAt: new Date(),
    });
    return this.getDetail(workspaceId, campaignId);
  }

  listTargets(
    workspaceId: string,
    campaignId: string,
    filters?: { q?: string; status?: string },
  ): Promise<CampaignTarget[]> {
    return this.requireCampaign(workspaceId, campaignId).then(() =>
      this.repo.listTargets(workspaceId, campaignId, filters),
    );
  }

  async getTargetWithAttempts(
    workspaceId: string,
    campaignId: string,
    targetId: string,
  ): Promise<{ contact: CampaignTarget; attempts: CampaignAttempt[] }> {
    await this.requireCampaign(workspaceId, campaignId);
    const contact = await this.repo.getTarget(workspaceId, campaignId, targetId);
    if (!contact) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Campaign target not found" });
    }
    const attempts = await this.repo.listAttemptsForTarget(workspaceId, campaignId, targetId);
    return { contact, attempts };
  }

  listAttempts(workspaceId: string, campaignId: string): Promise<CampaignAttempt[]> {
    return this.requireCampaign(workspaceId, campaignId).then(() =>
      this.repo.listAttempts(workspaceId, campaignId),
    );
  }

  private async requireCampaign(workspaceId: string, campaignId: string): Promise<CampaignRecord> {
    const campaign = await this.repo.get(workspaceId, campaignId);
    if (!campaign) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Campaign not found" });
    }
    return campaign;
  }

  private assertVersion(campaign: CampaignRecord, expectedVersion?: number): void {
    if (typeof expectedVersion === "number" && expectedVersion !== campaign.version) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Campaign version conflict; refresh and retry",
      });
    }
  }
}

function parseScheduledStart(schedule: CampaignSchedule): Date | null {
  if (!schedule.startDate || !schedule.startTime) return null;
  const iso = `${schedule.startDate}T${schedule.startTime}:00Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDetail(
  campaign: CampaignRecord,
  metrics: Awaited<ReturnType<CampaignsRepository["metrics"]>>,
): CampaignDetail {
  return {
    id: campaign.id,
    workspaceId: campaign.workspaceId,
    name: campaign.name,
    description: campaign.description,
    agentId: campaign.agentId,
    agentName: campaign.agentName,
    status: campaign.status,
    eligibleContacts: metrics.eligibleContacts,
    completedContacts: metrics.completedContacts,
    answerRate: metrics.eligibleContacts > 0 ? metrics.answerRate : null,
    scheduledStart: campaign.scheduledStart?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
    version: campaign.version,
    audienceSchema: campaign.audienceSchema,
    schedule: campaign.schedule,
    pacing: campaign.pacing,
    retryPolicy: campaign.retryPolicy,
    metrics,
  };
}
