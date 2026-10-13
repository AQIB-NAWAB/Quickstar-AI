import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  LeadFieldDef,
  LeadRecord,
  LeadSentiment,
  LeadStatus,
  LeadUpsertInput,
} from "../domain/types.js";
import type { LeadsRepository } from "../repository/leads.repository.js";
import {
  isLeadSentiment,
  isLeadStatus,
  mergeCapturedFields,
  sanitizeCapturedFields,
  sanitizeTags,
} from "../utils/fields.js";
import { normalizeLeadSchema, projectDenormFromAttributes } from "../utils/lead-schema.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LeadsService {
  constructor(
    private readonly repo: LeadsRepository,
    private readonly limits: { maxCapturedFieldKeys: number; maxCapturedFieldValueLength: number },
  ) {}

  list(
    workspaceId: string,
    filters?: { q?: string; status?: string; tag?: string; limit?: number },
  ): Promise<{ leads: LeadRecord[]; availableTags: string[]; total: number }> {
    if (filters?.status && filters.status !== "all" && !isLeadStatus(filters.status)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "status filter must be new|contacted|qualified|disqualified",
      });
    }
    return this.repo.list(workspaceId, filters);
  }

  async get(workspaceId: string, leadId: string): Promise<LeadRecord> {
    const lead = await this.repo.get(workspaceId, leadId);
    if (!lead) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Lead not found" });
    }
    return lead;
  }

  getSchema(workspaceId: string): Promise<LeadFieldDef[]> {
    return this.repo.getLeadSchema(workspaceId);
  }

  async putSchema(workspaceId: string, raw: unknown): Promise<LeadFieldDef[]> {
    const schema = normalizeLeadSchema(raw);
    return this.repo.putLeadSchema(workspaceId, schema);
  }

  /**
   * Idempotent upsert for staff UI and Moaz's lead-gen bot.
   * Same idempotency_key or external_id returns the existing row (optionally merged).
   */
  async upsert(
    workspaceId: string,
    body: LeadUpsertInput & { merge_on_conflict?: boolean },
  ): Promise<{ lead: LeadRecord; created: boolean }> {
    const fieldLimits = {
      maxKeys: this.limits.maxCapturedFieldKeys,
      maxValueLength: this.limits.maxCapturedFieldValueLength,
    };

    const idempotencyKey = body.idempotencyKey?.trim() || null;
    const externalId = body.externalId?.trim() || null;

    if (idempotencyKey) {
      const existing = await this.repo.findByIdempotencyKey(workspaceId, idempotencyKey);
      if (existing) {
        if (body.merge_on_conflict) {
          const merged = await this.mergeInto(workspaceId, existing, body);
          return { lead: merged, created: false };
        }
        return { lead: existing, created: false };
      }
    }
    if (externalId) {
      const existing = await this.repo.findByExternalId(workspaceId, externalId);
      if (existing) {
        if (body.merge_on_conflict) {
          const merged = await this.mergeInto(workspaceId, existing, body);
          return { lead: merged, created: false };
        }
        return { lead: existing, created: false };
      }
    }

    const conversationId = body.conversationId?.trim() || null;
    if (conversationId && !UUID_RE.test(conversationId)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "conversation_id must be a UUID when provided",
      });
    }

    const status: LeadStatus =
      body.status && isLeadStatus(body.status) ? body.status : "new";
    const sentiment: LeadSentiment =
      body.sentiment && isLeadSentiment(body.sentiment) ? body.sentiment : "unknown";

    const capturedFields = sanitizeCapturedFields(body.capturedFields ?? {}, fieldLimits);
    const schema = await this.repo.getLeadSchema(workspaceId);
    const denorm = projectDenormFromAttributes(schema, capturedFields, {
      name: body.name,
      email: body.email,
      phone: body.phone,
    });

    return this.repo.create(workspaceId, {
      name: denorm.name,
      email: denorm.email,
      phone: denorm.phone,
      intent: body.intent?.trim() || null,
      qualificationScore:
        typeof body.qualificationScore === "number" ? body.qualificationScore : null,
      qualificationMax:
        typeof body.qualificationMax === "number" ? body.qualificationMax : null,
      sentiment,
      status,
      tags: sanitizeTags(body.tags ?? []),
      source: (body.source?.trim() || "api").slice(0, 64),
      capturedFields,
      notes: body.notes?.trim() || null,
      conversationId,
      externalId,
      idempotencyKey,
      capturedAt: body.capturedAt ?? new Date(),
    });
  }

  async updateStatus(
    workspaceId: string,
    leadId: string,
    status: string,
    expectedVersion?: number,
  ): Promise<LeadRecord> {
    if (!isLeadStatus(status)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "status must be new|contacted|qualified|disqualified",
      });
    }
    const existing = await this.get(workspaceId, leadId);
    const version = typeof expectedVersion === "number" ? expectedVersion : existing.version;
    if (version !== existing.version) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Lead version conflict; refresh and retry",
      });
    }
    return this.repo.update(workspaceId, leadId, existing.version, { status });
  }

  async update(
    workspaceId: string,
    leadId: string,
    body: LeadUpsertInput & { expected_version?: number },
  ): Promise<LeadRecord> {
    const existing = await this.get(workspaceId, leadId);
    const expected =
      typeof body.expected_version === "number" ? body.expected_version : existing.version;
    if (expected !== existing.version) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Lead version conflict; refresh and retry",
      });
    }

    const fieldLimits = {
      maxKeys: this.limits.maxCapturedFieldKeys,
      maxValueLength: this.limits.maxCapturedFieldValueLength,
    };

    if (body.status && !isLeadStatus(body.status)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "invalid status" });
    }
    if (body.sentiment && !isLeadSentiment(body.sentiment)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "invalid sentiment" });
    }

    const mergedFields = body.capturedFields
      ? mergeCapturedFields(existing.capturedFields, body.capturedFields, fieldLimits)
      : undefined;

    let name = body.name === undefined ? undefined : body.name?.trim() || null;
    let email = body.email === undefined ? undefined : body.email?.trim().toLowerCase() || null;
    let phone = body.phone === undefined ? undefined : body.phone?.trim() || null;

    if (mergedFields) {
      const schema = await this.repo.getLeadSchema(workspaceId);
      const denorm = projectDenormFromAttributes(schema, mergedFields, {
        name: name ?? existing.name,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
      });
      name = denorm.name;
      email = denorm.email;
      phone = denorm.phone;
    }

    return this.repo.update(workspaceId, leadId, existing.version, {
      name,
      email,
      phone,
      intent: body.intent === undefined ? undefined : body.intent?.trim() || null,
      qualificationScore: body.qualificationScore,
      qualificationMax: body.qualificationMax,
      sentiment: body.sentiment,
      status: body.status,
      tags: body.tags ? sanitizeTags(body.tags) : undefined,
      source: body.source?.trim(),
      capturedFields: mergedFields,
      notes: body.notes === undefined ? undefined : body.notes?.trim() || null,
      conversationId:
        body.conversationId === undefined ? undefined : body.conversationId?.trim() || null,
      externalId: body.externalId === undefined ? undefined : body.externalId?.trim() || null,
    });
  }

  private async mergeInto(
    workspaceId: string,
    existing: LeadRecord,
    body: LeadUpsertInput,
  ): Promise<LeadRecord> {
    const fieldLimits = {
      maxKeys: this.limits.maxCapturedFieldKeys,
      maxValueLength: this.limits.maxCapturedFieldValueLength,
    };
    const mergedFields = body.capturedFields
      ? mergeCapturedFields(existing.capturedFields, body.capturedFields, fieldLimits)
      : undefined;

    let name = body.name?.trim() || undefined;
    let email = body.email?.trim().toLowerCase() || undefined;
    let phone = body.phone?.trim() || undefined;

    if (mergedFields) {
      const schema = await this.repo.getLeadSchema(workspaceId);
      const denorm = projectDenormFromAttributes(schema, mergedFields, {
        name: name ?? existing.name,
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
      });
      name = denorm.name ?? undefined;
      email = denorm.email ?? undefined;
      phone = denorm.phone ?? undefined;
    }

    return this.repo.update(workspaceId, existing.id, existing.version, {
      name,
      email,
      phone,
      intent: body.intent?.trim() || undefined,
      qualificationScore: body.qualificationScore,
      qualificationMax: body.qualificationMax,
      sentiment: body.sentiment && isLeadSentiment(body.sentiment) ? body.sentiment : undefined,
      status: body.status && isLeadStatus(body.status) ? body.status : undefined,
      tags: body.tags ? sanitizeTags(body.tags) : undefined,
      source: body.source?.trim(),
      capturedFields: mergedFields,
      notes: body.notes?.trim() || undefined,
      conversationId: body.conversationId?.trim() || undefined,
    });
  }
}
