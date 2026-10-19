import { WORKSPACE_PERMISSIONS, type CampaignLeadDelivery } from "@quickstart/contracts";
import { sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type {
  CampaignAttempt,
  CampaignDetail,
  CampaignSchedule,
  CampaignTarget,
  CampaignTimezoneMode,
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
    caller_id: c.callerId ?? null,
    agent_version_id: c.agentVersionId ?? null,
    status: c.status,
    eligible_contacts: c.eligibleContacts,
    completed_contacts: c.completedContacts,
    held_contacts_count: c.heldContactsCount ?? 0,
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
      end_date: c.schedule.endDate ?? null,
      timezone: c.schedule.timezone,
      timezone_mode: c.schedule.timezoneMode ?? "fixed",
      daily_window_from: c.schedule.dailyWindowFrom,
      daily_window_to: c.schedule.dailyWindowTo,
      weekdays: c.schedule.weekdays ?? [1, 2, 3, 4, 5],
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
    timezone: t.timezone ?? null,
    timezone_provenance: t.timezoneProvenance ?? null,
    is_held: t.isHeld ?? false,
    held_reason: t.heldReason ?? null,
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
    provider_call_sid: a.providerCallSid ?? null,
    provider: a.provider ?? "twilio",
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
      timezone: typeof row.timezone === "string" ? row.timezone : undefined,
      attributes: attributesRaw,
      sourceKind: (row.source_kind as "csv" | "lead" | "api" | undefined) ?? "csv",
      sourceRef: (row.source_ref as string | null | undefined) ?? null,
    };
  });
}

function parseSchedule(raw: unknown): CampaignSchedule | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  const rawTzMode = s.timezone_mode ?? s.timezoneMode;
  return {
    startDate: String(s.start_date ?? s.startDate ?? ""),
    startTime: String(s.start_time ?? s.startTime ?? "09:00"),
    endDate: (s.end_date ?? s.endDate ?? null) as string | null,
    timezone: String(s.timezone ?? "UTC"),
    timezoneMode: (rawTzMode === "recipient" || rawTzMode === "recipient_local" ? "recipient_local" : "campaign") as CampaignTimezoneMode,
    dailyWindowFrom: String(s.daily_window_from ?? s.dailyWindowFrom ?? "09:00"),
    dailyWindowTo: String(s.daily_window_to ?? s.dailyWindowTo ?? "17:00"),
    weekdays: Array.isArray(s.weekdays) ? (s.weekdays as number[]) : [1, 2, 3, 4, 5],
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
    summary: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const sum = await campaigns.directorySummary(workspaceId);
      sendPlatformJson(res, 200, sum);
    }) as RequestHandler,

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
        caller_id: typeof body.caller_id === "string" ? body.caller_id : undefined,
        agent_version_id: typeof body.agent_version_id === "string" ? body.agent_version_id : undefined,
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

    updateDraft: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const expectedVersion = parseExpectedVersion(body) ?? 0;
      const detail = await campaigns.updateDraft(workspaceId, campaignId, expectedVersion, {
        name: typeof body.name === "string" ? body.name : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
        agent_id: typeof body.agent_id === "string" ? body.agent_id : undefined,
        agent_name: typeof body.agent_name === "string" ? body.agent_name : undefined,
        caller_id: typeof body.caller_id === "string" ? body.caller_id : undefined,
        agent_version_id: typeof body.agent_version_id === "string" ? body.agent_version_id : undefined,
        schedule: parseSchedule(body.schedule) as any,
        pacing: parsePacing(body.pacing),
        retry_policy: parseRetry(body.retry_policy),
      });
      sendPlatformJson(res, 200, { campaign: toApiCampaign(detail) });
    }) as RequestHandler,

    delete: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      await campaigns.delete(workspaceId, campaignId);
      sendPlatformJson(res, 200, { deleted: true, id: campaignId });
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

    /** Internal: lead-generation CampaignLeadDelivery ingest (Bearer CAMPAIGN_INTERNAL_TOKEN). */
    ingestLeadDelivery: (async (req, res) => {
      const body = (req.body ?? {}) as CampaignLeadDelivery;
      const receipt = await campaigns.ingestLeadDelivery(body);
      sendPlatformJson(res, 200, receipt);
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

    exportResults: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const csv = await campaigns.exportCsv(workspaceId, campaignId);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="campaign-${campaignId}-results.csv"`,
      );
      res.status(200).send(csv);
    }) as RequestHandler,

    metrics: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const detail = await campaigns.getDetail(workspaceId, campaignId);
      sendPlatformJson(res, 200, {
        campaign_id: detail.id,
        status: detail.status,
        version: detail.version,
        metrics: toApiCampaign(detail).metrics,
      });
    }) as RequestHandler,

    reconcileAttempt: (async (req, res) => {
      const body = (req.body ?? {}) as {
        provider_call_sid?: string;
        status?: CampaignAttempt["status"];
        duration_seconds?: number;
        hangup_cause?: string;
        amd_result?: string;
      };
      if (!body.provider_call_sid || !body.status) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: {
            code: "VALIDATION_FAILED",
            message: "provider_call_sid and status are required",
          },
        });
        return;
      }
      const attempt = await campaigns.reconcileAttempt({
        providerCallSid: body.provider_call_sid,
        status: body.status,
        durationSeconds: body.duration_seconds,
        hangupCause: body.hangup_cause,
        amdResult: body.amd_result,
      });
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        reconciled: Boolean(attempt),
        attempt: attempt ? toApiAttempt(attempt) : null,
      });
    }) as RequestHandler,
  };
}
