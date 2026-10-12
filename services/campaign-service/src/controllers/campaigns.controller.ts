import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type {
  CampaignAttempt,
  CampaignDetail,
  CampaignTarget,
  IncomingTarget,
} from "../domain/types.js";
import type { CampaignsService } from "../services/campaigns.service.js";
import { routeParam } from "../utils/route-param.js";

export const CAMPAIGN_READ = WORKSPACE_PERMISSIONS.CAMPAIGN_READ;
export const CAMPAIGN_EDIT = WORKSPACE_PERMISSIONS.CAMPAIGN_EDIT;
export const CAMPAIGN_CONTROL = WORKSPACE_PERMISSIONS.CAMPAIGN_CONTROL;
export const CAMPAIGN_DELETE = WORKSPACE_PERMISSIONS.CAMPAIGN_DELETE;

function toApiCampaign(c: CampaignDetail) {
  return {
    id: c.id,
    workspace_id: c.workspaceId,
    name: c.name,
    description: c.description,
    agent_id: c.agentId,
    agent_name: c.agentName,
    status: c.status,
    eligible_contacts: c.eligibleContacts,
    completed_contacts: c.completedContacts,
    answer_rate: c.answerRate,
    scheduled_start: c.scheduledStart,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    version: c.version,
    audience_schema: c.audienceSchema.map((f) => ({
      key: f.key,
      label: f.label,
      role: f.role,
      source_column: f.sourceColumn,
      required: f.required,
    })),
    schedule: {
      start_date: c.schedule.startDate,
      start_time: c.schedule.startTime,
      timezone: c.schedule.timezone,
      daily_window_from: c.schedule.dailyWindowFrom,
      daily_window_to: c.schedule.dailyWindowTo,
    },
    pacing: {
      max_concurrent_calls: c.pacing.maxConcurrentCalls,
      max_call_starts_per_minute: c.pacing.maxCallStartsPerMinute,
    },
    retry_policy: {
      max_retries: c.retryPolicy.maxRetries,
      retry_interval_minutes: c.retryPolicy.retryIntervalMinutes,
      eligible_outcomes: c.retryPolicy.eligibleOutcomes,
    },
    metrics: {
      eligible_contacts: c.metrics.eligibleContacts,
      completed_contacts: c.metrics.completedContacts,
      answered_contacts: c.metrics.answeredContacts,
      answer_rate: c.metrics.answerRate,
      avg_answered_duration_seconds: c.metrics.avgAnsweredDurationSeconds,
      active_calls: c.metrics.activeCalls,
      queued_contacts: c.metrics.queuedContacts,
      retrying_contacts: c.metrics.retryingContacts,
      started_attempts: c.metrics.startedAttempts,
    },
  };
}

function toApiTarget(t: CampaignTarget) {
  return {
    id: t.id,
    campaign_id: t.campaignId,
    name: t.displayName,
    phone: t.dialAddress,
    email: t.email,
    custom_fields: t.attributes,
    attributes: t.attributes,
    source_kind: t.sourceKind,
    source_ref: t.sourceRef,
    status: t.status,
    attempts_count: t.attemptsCount,
    last_attempt_at: t.lastAttemptAt?.toISOString() ?? null,
    outcome: t.outcome,
  };
}

function toApiAttempt(a: CampaignAttempt) {
  return {
    id: a.id,
    contact_id: a.targetId,
    campaign_id: a.campaignId,
    call_id: a.callId,
    attempt_number: a.attemptNumber,
    started_at: a.startedAt.toISOString(),
    ended_at: a.endedAt?.toISOString() ?? null,
    duration_seconds: a.durationSeconds,
    status: a.status,
    outcome: a.outcome,
    error: a.error ?? undefined,
  };
}

function parseExpectedVersion(body: Record<string, unknown>): number | undefined {
  if (typeof body.expected_version === "number") return body.expected_version;
  if (typeof body.version === "number") return body.version;
  return undefined;
}

function parseIncomingTargets(raw: unknown): IncomingTarget[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const attributesRaw =
      (row.attributes as Record<string, string> | undefined) ??
      (row.custom_fields as Record<string, string> | undefined) ??
      {};
    return {
      dialAddress: String(row.dial_address ?? row.phone ?? row.dialAddress ?? ""),
      displayName: (row.display_name ?? row.name ?? row.displayName ?? null) as string | null,
      email: (row.email as string | null | undefined) ?? null,
      attributes: attributesRaw,
      sourceKind: (row.source_kind as "csv" | "lead" | "api" | undefined) ?? "csv",
      sourceRef: (row.source_ref as string | null | undefined) ?? null,
    };
  });
}

function parseSchedule(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  return {
    startDate: String(s.start_date ?? s.startDate ?? ""),
    startTime: String(s.start_time ?? s.startTime ?? "09:00"),
    timezone: String(s.timezone ?? "UTC"),
    dailyWindowFrom: String(s.daily_window_from ?? s.dailyWindowFrom ?? "09:00"),
    dailyWindowTo: String(s.daily_window_to ?? s.dailyWindowTo ?? "17:00"),
  };
}

function parsePacing(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  return {
    maxConcurrentCalls: Number(p.max_concurrent_calls ?? p.maxConcurrentCalls ?? 5),
    maxCallStartsPerMinute: Number(p.max_call_starts_per_minute ?? p.maxCallStartsPerMinute ?? 30),
  };
}

function parseRetry(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  return {
    maxRetries: Number(r.max_retries ?? r.maxRetries ?? 2),
    retryIntervalMinutes: Number(r.retry_interval_minutes ?? r.retryIntervalMinutes ?? 30),
    eligibleOutcomes: Array.isArray(r.eligible_outcomes ?? r.eligibleOutcomes)
      ? ((r.eligible_outcomes ?? r.eligibleOutcomes) as string[])
      : ["no_answer", "busy"],
  };
}

export function createCampaignsController(campaigns: CampaignsService) {
  return {
    list: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const items = await campaigns.list(workspaceId, { q, status });
      sendPlatformJson(res, 200, {
        campaigns: items.map((c) => ({
          id: c.id,
          workspace_id: c.workspaceId,
          name: c.name,
          description: c.description,
          agent_id: c.agentId,
          agent_name: c.agentName,
          status: c.status,
          eligible_contacts: c.eligibleContacts,
          completed_contacts: c.completedContacts,
          answer_rate: c.answerRate,
          scheduled_start: c.scheduledStart,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
          version: c.version,
        })),
      });
    }) as RequestHandler,

    get: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const detail = await campaigns.getDetail(workspaceId, campaignId);
      sendPlatformJson(res, 200, { campaign: toApiCampaign(detail) });
    }) as RequestHandler,

    create: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const detail = await campaigns.create(workspaceId, {
        name: typeof body.name === "string" ? body.name : undefined,
        description: (body.description as string | null | undefined) ?? null,
        agent_id: typeof body.agent_id === "string" ? body.agent_id : undefined,
        agent_name: typeof body.agent_name === "string" ? body.agent_name : undefined,
        audience_schema: body.audience_schema,
        schedule: parseSchedule(body.schedule),
        pacing: parsePacing(body.pacing),
        retry_policy: parseRetry(body.retry_policy),
        idempotency_key:
          typeof body.idempotency_key === "string" ? body.idempotency_key : null,
        targets: parseIncomingTargets(body.targets),
        status: body.status as never,
      });
      sendPlatformJson(res, 201, { campaign: toApiCampaign(detail) });
    }) as RequestHandler,

    importTargets: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await campaigns.importTargets(
        workspaceId,
        campaignId,
        parseIncomingTargets(body.targets),
      );
      sendPlatformJson(res, 200, result);
    }) as RequestHandler,

    launch: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const detail = await campaigns.launch(workspaceId, campaignId, parseExpectedVersion(body));
      sendPlatformJson(res, 200, { campaign: toApiCampaign(detail) });
    }) as RequestHandler,

    pause: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const detail = await campaigns.pause(workspaceId, campaignId, parseExpectedVersion(body));
      sendPlatformJson(res, 200, { campaign: toApiCampaign(detail) });
    }) as RequestHandler,

    resume: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const detail = await campaigns.resume(workspaceId, campaignId, parseExpectedVersion(body));
      sendPlatformJson(res, 200, { campaign: toApiCampaign(detail) });
    }) as RequestHandler,

    stop: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const detail = await campaigns.stop(workspaceId, campaignId, parseExpectedVersion(body));
      sendPlatformJson(res, 200, { campaign: toApiCampaign(detail) });
    }) as RequestHandler,

    listTargets: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const contacts = await campaigns.listTargets(workspaceId, campaignId, { q, status });
      sendPlatformJson(res, 200, { contacts: contacts.map(toApiTarget) });
    }) as RequestHandler,

    getTarget: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const contactId = routeParam(req.params.contactId);
      const { contact, attempts } = await campaigns.getTargetWithAttempts(
        workspaceId,
        campaignId,
        contactId,
      );
      sendPlatformJson(res, 200, {
        contact: toApiTarget(contact),
        attempts: attempts.map(toApiAttempt),
      });
    }) as RequestHandler,

    listAttempts: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const attempts = await campaigns.listAttempts(workspaceId, campaignId);
      sendPlatformJson(res, 200, { attempts: attempts.map(toApiAttempt) });
    }) as RequestHandler,
  };
}
