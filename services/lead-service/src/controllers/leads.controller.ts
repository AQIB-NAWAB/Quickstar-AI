import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { CapturedFields, LeadRecord, LeadSentiment, LeadStatus } from "../domain/types.js";
import type { LeadsService } from "../services/leads.service.js";
import { routeParam } from "../utils/route-param.js";
import { sanitizeCapturedFields } from "../utils/fields.js";

export const LEAD_READ = WORKSPACE_PERMISSIONS.LEAD_READ;
export const LEAD_CREATE = WORKSPACE_PERMISSIONS.LEAD_CREATE;
export const LEAD_EDIT = WORKSPACE_PERMISSIONS.LEAD_EDIT;

function toApiLead(lead: LeadRecord) {
  return {
    id: lead.id,
    workspace_id: lead.workspaceId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    intent: lead.intent,
    qualification_score: lead.qualificationScore,
    qualification_max: lead.qualificationMax,
    sentiment: lead.sentiment,
    status: lead.status,
    tags: lead.tags,
    source: lead.source,
    captured_fields: lead.capturedFields,
    notes: lead.notes,
    conversation_id: lead.conversationId,
    originating_conversation_id: lead.conversationId,
    external_id: lead.externalId,
    idempotency_key: lead.idempotencyKey,
    version: lead.version,
    captured_at: lead.capturedAt?.toISOString() ?? null,
    created_at: lead.createdAt.toISOString(),
    updated_at: lead.updatedAt.toISOString(),
    transcript_status: "unavailable",
    transcript_messages: [],
  };
}

function parseUpsertBody(body: Record<string, unknown>) {
  const rawFields =
    (body.captured_fields as Record<string, unknown> | undefined) ??
    (body.capturedFields as Record<string, unknown> | undefined) ??
    {};
  const capturedFields: CapturedFields = sanitizeCapturedFields(rawFields, {
    maxKeys: 50,
    maxValueLength: 2000,
  });
  return {
    name: (body.name as string | null | undefined) ?? null,
    email: (body.email as string | null | undefined) ?? null,
    phone: (body.phone as string | null | undefined) ?? null,
    intent: (body.intent as string | null | undefined) ?? null,
    qualificationScore:
      typeof body.qualification_score === "number"
        ? body.qualification_score
        : typeof body.qualificationScore === "number"
          ? body.qualificationScore
          : null,
    qualificationMax:
      typeof body.qualification_max === "number"
        ? body.qualification_max
        : typeof body.qualificationMax === "number"
          ? body.qualificationMax
          : null,
    sentiment: body.sentiment as LeadSentiment | undefined,
    status: body.status as LeadStatus | undefined,
    tags: body.tags as string[] | undefined,
    source: typeof body.source === "string" ? body.source : undefined,
    capturedFields,
    notes: (body.notes as string | null | undefined) ?? null,
    conversationId:
      (body.conversation_id as string | null | undefined) ??
      (body.originating_conversation_id as string | null | undefined) ??
      (body.conversationId as string | null | undefined) ??
      null,
    externalId:
      (body.external_id as string | null | undefined) ??
      (body.externalId as string | null | undefined) ??
      null,
    idempotencyKey:
      (body.idempotency_key as string | null | undefined) ??
      (body.idempotencyKey as string | null | undefined) ??
      null,
    merge_on_conflict: body.merge_on_conflict === true || body.mergeOnConflict === true,
  };
}

export function createLeadsController(leads: LeadsService) {
  return {
    list: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
      const result = await leads.list(workspaceId, { q, status, tag });
      sendPlatformJson(res, 200, {
        leads: result.leads.map(toApiLead),
        available_tags: result.availableTags,
        total: result.leads.length,
      });
    }) as RequestHandler,

    get: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const leadId = routeParam(req.params.leadId);
      const lead = await leads.get(workspaceId, leadId);
      sendPlatformJson(res, 200, { lead: toApiLead(lead) });
    }) as RequestHandler,

    create: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const { lead, created } = await leads.upsert(workspaceId, parseUpsertBody(body));
      sendPlatformJson(res, created ? 201 : 200, { lead: toApiLead(lead), created });
    }) as RequestHandler,

    update: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const leadId = routeParam(req.params.leadId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const expectedVersion =
        typeof body.expected_version === "number"
          ? body.expected_version
          : typeof body.version === "number"
            ? body.version
            : undefined;
      const lead = await leads.update(workspaceId, leadId, {
        ...parseUpsertBody(body),
        expected_version: expectedVersion,
      });
      sendPlatformJson(res, 200, { lead: toApiLead(lead) });
    }) as RequestHandler,

    updateStatus: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const leadId = routeParam(req.params.leadId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const status = String(body.status ?? "");
      const expectedVersion =
        typeof body.expected_version === "number"
          ? body.expected_version
          : typeof body.version === "number"
            ? body.version
            : undefined;
      const lead = await leads.updateStatus(workspaceId, leadId, status, expectedVersion);
      sendPlatformJson(res, 200, { lead: toApiLead(lead) });
    }) as RequestHandler,

    /** Internal upsert for Moaz lead-gen bot (Bearer LEAD_INTERNAL_TOKEN). */
    internalUpsert: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const parsed = parseUpsertBody(body);
      if (!parsed.source) {
        parsed.source = "lead_gen_bot";
      }
      parsed.merge_on_conflict = true;
      const { lead, created } = await leads.upsert(workspaceId, parsed);
      sendPlatformJson(res, created ? 201 : 200, { lead: toApiLead(lead), created });
    }) as RequestHandler,
  };
}
