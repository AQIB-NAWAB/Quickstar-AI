import { resolveTelephonyMode } from "./telephony-mode";
import type {
  AudienceFieldDef,
  AudienceFieldRole,
  CampaignContact,
  CampaignDetail,
  CampaignSummary,
  ContactAttempt,
  RepositoryResult,
  WizardDraft,
} from "./types";

type ApiError = { code?: string; message: string };

async function bff<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; data?: T; error?: ApiError }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: ApiError;
    };
    if (!res.ok) {
      return {
        status: res.status,
        error:
          body.error ?? { code: `HTTP_${res.status}`, message: res.statusText || "Request failed" },
      };
    }
    return { status: res.status, data: body as unknown as T };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return {
      status: 0,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network request failed",
      },
    };
  }
}

function failResult<T>(status: number, error?: ApiError): RepositoryResult<T> {
  if (status === 0) return { status: "unavailable", message: error?.message || "Service unavailable" };
  if (status === 403) return { status: "forbidden", message: error?.message || "Forbidden" };
  if (status === 404) return { status: "not_found", message: error?.message || "Not found" };
  if (status === 409) return { status: "conflict", message: error?.message || "Conflict" };
  return { status: "error", message: error?.message || "Request failed" };
}

function toResult<T>(
  status: number,
  data: T | undefined,
  error?: ApiError,
): RepositoryResult<T> {
  if (status === 0 || status === 403 || status === 404 || status === 409 || status >= 400 || data === undefined) {
    return failResult(status, error);
  }
  return { status: "ready", data };
}

function mapSummary(raw: Record<string, unknown>): CampaignSummary {
  return {
    id: String(raw.id),
    workspaceId: String(raw.workspace_id ?? raw.workspaceId),
    name: String(raw.name),
    description: (raw.description as string | null) ?? null,
    agentId: String(raw.agent_id ?? raw.agentId ?? ""),
    agentName: String(raw.agent_name ?? raw.agentName ?? ""),
    callerId: (raw.caller_id ?? raw.callerId ?? null) as string | null,
    agentVersionId: (raw.agent_version_id ?? raw.agentVersionId ?? null) as string | null,
    status: raw.status as CampaignSummary["status"],
    eligibleContacts: Number(raw.eligible_contacts ?? raw.eligibleContacts ?? 0),
    completedContacts: Number(raw.completed_contacts ?? raw.completedContacts ?? 0),
    heldContactsCount: Number(raw.held_contacts_count ?? raw.heldContactsCount ?? 0),
    answerRate:
      raw.answer_rate === null || raw.answer_rate === undefined
        ? null
        : Number(raw.answer_rate ?? raw.answerRate),
    scheduledStart: (raw.scheduled_start as string | null) ?? null,
    createdAt: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? new Date().toISOString()),
    version: typeof raw.version === "number" ? raw.version : 1,
  };
}

function mapAudienceSchema(raw: unknown): AudienceFieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const f = item as Record<string, unknown>;
    return {
      key: String(f.key),
      label: String(f.label ?? f.key),
      role: (f.role as AudienceFieldRole) ?? "custom",
      sourceColumn:
        typeof f.source_column === "string"
          ? f.source_column
          : typeof f.sourceColumn === "string"
            ? f.sourceColumn
            : undefined,
      required: Boolean(f.required),
    };
  });
}

function mapDetail(raw: Record<string, unknown>): CampaignDetail {
  const schedule = (raw.schedule as Record<string, unknown>) ?? {};
  const pacing = (raw.pacing as Record<string, unknown>) ?? {};
  const retry = (raw.retry_policy as Record<string, unknown>) ?? {};
  const metrics = (raw.metrics as Record<string, unknown>) ?? {};
  const summary = mapSummary(raw);
  return {
    ...summary,
    audienceSchema: mapAudienceSchema(raw.audience_schema ?? raw.audienceSchema),
    schedule: {
      startDate: String(schedule.start_date ?? schedule.startDate ?? ""),
      startTime: String(schedule.start_time ?? schedule.startTime ?? "09:00"),
      endDate: (schedule.end_date ?? schedule.endDate ?? null) as string | null,
      timezone: String(schedule.timezone ?? "UTC"),
      timezoneMode: (schedule.timezone_mode ?? schedule.timezoneMode ?? "fixed") as
        | "fixed"
        | "recipient"
        | "recipient_local",
      dailyWindowFrom: String(schedule.daily_window_from ?? schedule.dailyWindowFrom ?? "09:00"),
      dailyWindowTo: String(schedule.daily_window_to ?? schedule.dailyWindowTo ?? "17:00"),
      weekdays: Array.isArray(schedule.weekdays) ? (schedule.weekdays as number[]) : [1, 2, 3, 4, 5],
    },
    pacing: {
      maxConcurrentCalls: Number(pacing.max_concurrent_calls ?? pacing.maxConcurrentCalls ?? 5),
      maxCallStartsPerMinute: Number(
        pacing.max_call_starts_per_minute ?? pacing.maxCallStartsPerMinute ?? 30,
      ),
    },
    retryPolicy: {
      maxRetries: Number(retry.max_retries ?? retry.maxRetries ?? 2),
      retryIntervalMinutes: Number(
        retry.retry_interval_minutes ?? retry.retryIntervalMinutes ?? 30,
      ),
      eligibleOutcomes: Array.isArray(retry.eligible_outcomes ?? retry.eligibleOutcomes)
        ? ((retry.eligible_outcomes ?? retry.eligibleOutcomes) as string[])
        : ["no_answer", "busy"],
    },
    metrics: {
      eligibleContacts: Number(metrics.eligible_contacts ?? metrics.eligibleContacts ?? 0),
      completedContacts: Number(metrics.completed_contacts ?? metrics.completedContacts ?? 0),
      answeredContacts: Number(metrics.answered_contacts ?? metrics.answeredContacts ?? 0),
      answerRate: Number(metrics.answer_rate ?? metrics.answerRate ?? 0),
      avgAnsweredDurationSeconds: Number(
        metrics.avg_answered_duration_seconds ?? metrics.avgAnsweredDurationSeconds ?? 0,
      ),
      activeCalls: Number(metrics.active_calls ?? metrics.activeCalls ?? 0),
      queuedContacts: Number(metrics.queued_contacts ?? metrics.queuedContacts ?? 0),
      retryingContacts: Number(metrics.retrying_contacts ?? metrics.retryingContacts ?? 0),
      startedAttempts: Number(metrics.started_attempts ?? metrics.startedAttempts ?? 0),
    },
    activityBuckets: [],
  };
}

function mapContact(raw: Record<string, unknown>): CampaignContact {
  const attrs =
    (raw.attributes as Record<string, string> | undefined) ??
    (raw.custom_fields as Record<string, string> | undefined) ??
    {};
  return {
    id: String(raw.id),
    campaignId: String(raw.campaign_id ?? raw.campaignId),
    name: (raw.name as string | null) ?? null,
    phone: String(raw.phone ?? raw.dial_address ?? ""),
    email: (raw.email as string | null) ?? null,
    timezone: (raw.timezone ?? null) as string | null,
    timezoneProvenance: (raw.timezone_provenance ?? raw.timezoneProvenance ?? null) as string | null,
    isHeld: Boolean(raw.is_held ?? raw.isHeld),
    heldReason: (raw.held_reason ?? raw.heldReason ?? null) as string | null,
    customFields: attrs,
    attributes: attrs,
    status: raw.status as CampaignContact["status"],
    attemptsCount: Number(raw.attempts_count ?? raw.attemptsCount ?? 0),
    lastAttemptAt: (raw.last_attempt_at as string | null) ?? null,
    outcome: (raw.outcome as string | null) ?? null,
  };
}

function mapAttempt(raw: Record<string, unknown>): ContactAttempt {
  return {
    id: String(raw.id),
    contactId: String(raw.contact_id ?? raw.target_id ?? raw.contactId),
    campaignId: String(raw.campaign_id ?? raw.campaignId),
    callId: (raw.call_id as string | null) ?? null,
    attemptNumber: Number(raw.attempt_number ?? raw.attemptNumber ?? 1),
    startedAt: String(raw.started_at ?? raw.startedAt),
    endedAt: (raw.ended_at as string | null) ?? null,
    durationSeconds:
      raw.duration_seconds === null || raw.duration_seconds === undefined
        ? null
        : Number(raw.duration_seconds),
    status: raw.status as ContactAttempt["status"],
    outcome: String(raw.outcome ?? ""),
    error: raw.error as ContactAttempt["error"],
  };
}

function buildAudienceSchema(draft: WizardDraft): AudienceFieldDef[] {
  const telephonyMode = resolveTelephonyMode(draft);
  if (draft.columnMappings.length > 0) {
    return draft.columnMappings.map((m) => ({
      key: m.key,
      label: m.sourceColumn,
      role: m.role,
      sourceColumn: m.sourceColumn,
      required: m.role === "dial" && telephonyMode === "required",
    }));
  }
  const schema: AudienceFieldDef[] = [];
  if (telephonyMode === "required") {
    schema.push({
      key: "phone",
      label: draft.mappedColumns.phone || "phone",
      role: "dial",
      sourceColumn: draft.mappedColumns.phone,
      required: true,
    });
  }
  if (draft.mappedColumns.name) {
    schema.push({
      key: "name",
      label: draft.mappedColumns.name,
      role: "identity",
      sourceColumn: draft.mappedColumns.name,
    });
  }
  if (draft.mappedColumns.email) {
    schema.push({
      key: "email",
      label: draft.mappedColumns.email,
      role: "contact_email",
      sourceColumn: draft.mappedColumns.email,
    });
  }
  for (const [key, source] of Object.entries(draft.mappedColumns.customFields ?? {})) {
    schema.push({ key, label: source, role: "custom", sourceColumn: source });
  }
  return schema;
}

export async function listCampaignsApi(
  workspaceId: string,
  filters?: { q?: string; status?: string },
  signal?: AbortSignal,
): Promise<RepositoryResult<CampaignSummary[]>> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  const qs = params.toString();
  const { status, data, error } = await bff<{ campaigns: Record<string, unknown>[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns${qs ? `?${qs}` : ""}`,
    { signal },
  );
  return toResult(status, (data?.campaigns ?? []).map(mapSummary), error);
}

export async function getCampaignApi(
  workspaceId: string,
  campaignId: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<CampaignDetail>> {
  const { status, data, error } = await bff<{ campaign: Record<string, unknown> }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}`,
    { signal },
  );
  if (error || !data?.campaign) return failResult<CampaignDetail>(status, error);
  return toResult(status, mapDetail(data.campaign));
}

export async function listContactsApi(
  workspaceId: string,
  campaignId: string,
  filters?: { q?: string; status?: string },
  signal?: AbortSignal,
): Promise<RepositoryResult<CampaignContact[]>> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  const qs = params.toString();
  const { status, data, error } = await bff<{ contacts: Record<string, unknown>[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}/contacts${qs ? `?${qs}` : ""}`,
    { signal },
  );
  return toResult(status, (data?.contacts ?? []).map(mapContact), error);
}

export async function getContactApi(
  workspaceId: string,
  campaignId: string,
  contactId: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<{ contact: CampaignContact; attempts: ContactAttempt[] }>> {
  const { status, data, error } = await bff<{
    contact: Record<string, unknown>;
    attempts: Record<string, unknown>[];
  }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}/contacts/${encodeURIComponent(contactId)}`,
    { signal },
  );
  if (error || !data?.contact) {
    return failResult<{ contact: CampaignContact; attempts: ContactAttempt[] }>(status, error);
  }
  return toResult(status, {
    contact: mapContact(data.contact),
    attempts: (data.attempts ?? []).map(mapAttempt),
  });
}

export async function listAttemptsApi(
  workspaceId: string,
  campaignId: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<ContactAttempt[]>> {
  const { status, data, error } = await bff<{ attempts: Record<string, unknown>[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}/attempts`,
    { signal },
  );
  return toResult(status, (data?.attempts ?? []).map(mapAttempt), error);
}

export async function saveDraftApi(
  workspaceId: string,
  draft: WizardDraft,
): Promise<RepositoryResult<CampaignSummary>> {
  const telephonyMode = resolveTelephonyMode(draft);
  const audienceSchema = buildAudienceSchema(draft);
  const targets = (draft.preparedTargets.length > 0
    ? draft.preparedTargets
    : draft.parsedRowsPreview.map((r) => ({
        phone: r.phone,
        name: r.name ?? null,
        email: r.email ?? null,
        timezone: undefined as string | undefined,
        attributes: r.customFields ?? {},
      }))
  ).map((t) => ({
    phone: t.phone,
    name: t.name ?? null,
    email: t.email ?? null,
    timezone: t.timezone,
    attributes: t.attributes ?? {},
    source_kind: (draft.audienceSource === "lead_run" ? "lead" : "csv") as "lead" | "csv",
    source_ref: "sourceRef" in t ? (t.sourceRef ?? null) : null,
  }));

  const body = {
    name: draft.name,
    description: draft.description || null,
    agent_id: draft.agentId,
    agent_name: draft.agentName,
    caller_id: draft.callerId || null,
    agent_version_id: draft.agentVersionId || null,
    audience_schema: audienceSchema.map((f) => ({
      key: f.key,
      label: f.label,
      role: f.role,
      source_column: f.sourceColumn,
      required: f.required,
    })),
    schedule: {
      start_date: draft.schedule.startDate,
      start_time: draft.schedule.startTime,
      end_date: draft.schedule.endDate ?? null,
      timezone: draft.schedule.timezone,
      timezone_mode: draft.schedule.timezoneMode ?? "fixed",
      daily_window_from: draft.schedule.dailyWindowFrom,
      daily_window_to: draft.schedule.dailyWindowTo,
      weekdays: draft.schedule.weekdays ?? [1, 2, 3, 4, 5],
    },
    pacing: {
      max_concurrent_calls: draft.pacing.maxConcurrentCalls,
      max_call_starts_per_minute: draft.pacing.maxCallStartsPerMinute,
    },
    retry_policy: {
      max_retries: draft.retryPolicy.maxRetries,
      retry_interval_minutes: draft.retryPolicy.retryIntervalMinutes,
      eligible_outcomes: draft.retryPolicy.eligibleOutcomes,
    },
    targets,
    status: telephonyMode === "none" ? "scheduled" : "draft",
  };

  const { status, data, error } = await bff<{ campaign: Record<string, unknown> }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns`,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (error || !data?.campaign) return failResult<CampaignSummary>(status, error);
  return toResult(status, mapSummary(data.campaign));
}

export async function updateDraftApi(
  workspaceId: string,
  campaignId: string,
  draft: Partial<WizardDraft>,
  version?: number,
): Promise<RepositoryResult<CampaignDetail>> {
  const body: Record<string, unknown> = {
    version,
    expected_version: version,
  };
  if (draft.name !== undefined) body.name = draft.name;
  if (draft.description !== undefined) body.description = draft.description;
  if (draft.agentId !== undefined) body.agent_id = draft.agentId;
  if (draft.agentName !== undefined) body.agent_name = draft.agentName;
  if (draft.callerId !== undefined) body.caller_id = draft.callerId;
  if (draft.agentVersionId !== undefined) body.agent_version_id = draft.agentVersionId;
  if (draft.schedule) {
    body.schedule = {
      start_date: draft.schedule.startDate,
      start_time: draft.schedule.startTime,
      end_date: draft.schedule.endDate ?? null,
      timezone: draft.schedule.timezone,
      timezone_mode: draft.schedule.timezoneMode ?? "fixed",
      daily_window_from: draft.schedule.dailyWindowFrom,
      daily_window_to: draft.schedule.dailyWindowTo,
      weekdays: draft.schedule.weekdays ?? [1, 2, 3, 4, 5],
    };
  }
  if (draft.pacing) {
    body.pacing = {
      max_concurrent_calls: draft.pacing.maxConcurrentCalls,
      max_call_starts_per_minute: draft.pacing.maxCallStartsPerMinute,
    };
  }
  if (draft.retryPolicy) {
    body.retry_policy = {
      max_retries: draft.retryPolicy.maxRetries,
      retry_interval_minutes: draft.retryPolicy.retryIntervalMinutes,
      eligible_outcomes: draft.retryPolicy.eligibleOutcomes,
    };
  }

  const { status, data, error } = await bff<{ campaign: Record<string, unknown> }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  if (error || !data?.campaign) return failResult<CampaignDetail>(status, error);
  return toResult(status, mapDetail(data.campaign));
}

export async function deleteCampaignApi(
  workspaceId: string,
  campaignId: string,
): Promise<RepositoryResult<void>> {
  const { status, error } = await bff<{ deleted: boolean }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}`,
    { method: "DELETE" },
  );
  if (error) return failResult<void>(status, error);
  return { status: "ready", data: undefined };
}

export async function getDirectorySummaryApi(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<RepositoryResult<import("./types").CampaignsDirectorySummary>> {
  const { status, data, error } = await bff<import("./types").CampaignsDirectorySummary>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/summary`,
    { signal },
  );
  if (error || !data) return failResult(status, error);
  return toResult(status, data);
}

export function getExportCsvUrl(workspaceId: string, campaignId: string): string {
  return `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}/export`;
}

async function controlApi(
  workspaceId: string,
  campaignId: string,
  action: "pause" | "resume" | "stop" | "launch",
  version?: number,
): Promise<RepositoryResult<CampaignDetail>> {
  const { status, data, error } = await bff<{ campaign: Record<string, unknown> }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/campaigns/${encodeURIComponent(campaignId)}/${action}`,
    {
      method: "POST",
      body: JSON.stringify({ expected_version: version }),
    },
  );
  if (error || !data?.campaign) return failResult<CampaignDetail>(status, error);
  return toResult(status, mapDetail(data.campaign));
}

export function launchCampaignApi(workspaceId: string, campaignId: string, version?: number) {
  return controlApi(workspaceId, campaignId, "launch", version);
}

export function pauseCampaignApi(workspaceId: string, campaignId: string, version?: number) {
  return controlApi(workspaceId, campaignId, "pause", version);
}

export function resumeCampaignApi(workspaceId: string, campaignId: string, version?: number) {
  return controlApi(workspaceId, campaignId, "resume", version);
}

export function stopCampaignApi(workspaceId: string, campaignId: string, version?: number) {
  return controlApi(workspaceId, campaignId, "stop", version);
}
