import { AppError, ErrorCode } from "@quickstart/errors";
import type { Pool } from "pg";
import type {
  CapturedFields,
  LeadFieldDef,
  LeadRecord,
  LeadSentiment,
  LeadStatus,
  LeadUpsertInput,
} from "../domain/types.js";
import { defaultLeadSchema, normalizeLeadSchema } from "../utils/lead-schema.js";

type LeadRow = {
  id: string;
  workspace_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  intent: string | null;
  qualification_score: string | number | null;
  qualification_max: string | number | null;
  sentiment: LeadSentiment;
  status: LeadStatus;
  tags: string[] | null;
  source: string;
  captured_fields: CapturedFields | string;
  notes: string | null;
  conversation_id: string | null;
  external_id: string | null;
  idempotency_key: string | null;
  version: number;
  captured_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function parseJson<T>(value: T | string, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value ?? fallback;
}

function toNumber(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapLead(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    intent: row.intent,
    qualificationScore: toNumber(row.qualification_score),
    qualificationMax: toNumber(row.qualification_max),
    sentiment: row.sentiment,
    status: row.status,
    tags: row.tags ?? [],
    source: row.source,
    capturedFields: parseJson(row.captured_fields, {}),
    notes: row.notes,
    conversationId: row.conversation_id,
    externalId: row.external_id,
    idempotencyKey: row.idempotency_key,
    version: row.version,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LeadsRepository {
  constructor(private readonly pool: Pool) {}

  async list(
    workspaceId: string,
    filters?: { q?: string; status?: string; tag?: string; limit?: number },
  ): Promise<{ leads: LeadRecord[]; availableTags: string[]; total: number }> {
    const params: unknown[] = [workspaceId];
    const clauses = ["workspace_id = $1", "deleted_at IS NULL"];

    if (filters?.status && filters.status !== "all") {
      params.push(filters.status);
      clauses.push(`status = $${params.length}`);
    }
    if (filters?.tag && filters.tag !== "all") {
      params.push(filters.tag.toLowerCase());
      clauses.push(`$${params.length} = ANY (tags)`);
    }
    if (filters?.q?.trim()) {
      params.push(`%${filters.q.trim().toLowerCase()}%`);
      clauses.push(
        `(lower(COALESCE(name,'')) LIKE $${params.length} OR lower(COALESCE(email,'')) LIKE $${params.length} OR COALESCE(phone,'') LIKE $${params.length} OR lower(COALESCE(intent,'')) LIKE $${params.length})`,
      );
    }

    const whereSql = clauses.join(" AND ");
    const limit = Math.min(Math.max(filters?.limit ?? 200, 1), 200);

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM leads WHERE ${whereSql}`,
      params,
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const result = await this.pool.query<LeadRow>(
      `SELECT * FROM leads
       WHERE ${whereSql}
       ORDER BY updated_at DESC
       LIMIT ${limit}`,
      params,
    );

    const tagsResult = await this.pool.query<{ tag: string }>(
      `SELECT DISTINCT unnest(tags) AS tag
       FROM leads
       WHERE workspace_id = $1 AND deleted_at IS NULL
       ORDER BY tag ASC
       LIMIT 200`,
      [workspaceId],
    );

    return {
      leads: result.rows.map(mapLead),
      availableTags: tagsResult.rows.map((r) => r.tag),
      total,
    };
  }

  async getLeadSchema(workspaceId: string): Promise<LeadFieldDef[]> {
    const result = await this.pool.query<{ lead_schema: unknown }>(
      `SELECT lead_schema FROM workspace_lead_settings WHERE workspace_id = $1`,
      [workspaceId],
    );
    if (!result.rows[0]) {
      return defaultLeadSchema();
    }
    return normalizeLeadSchema(result.rows[0].lead_schema);
  }

  async putLeadSchema(workspaceId: string, schema: LeadFieldDef[]): Promise<LeadFieldDef[]> {
    const normalized = normalizeLeadSchema(schema);
    await this.pool.query(
      `INSERT INTO workspace_lead_settings (workspace_id, lead_schema, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (workspace_id) DO UPDATE
       SET lead_schema = EXCLUDED.lead_schema, updated_at = NOW()`,
      [workspaceId, JSON.stringify(normalized)],
    );
    return normalized;
  }

  async get(workspaceId: string, leadId: string): Promise<LeadRecord | null> {
    const result = await this.pool.query<LeadRow>(
      `SELECT * FROM leads
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [leadId, workspaceId],
    );
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }

  async findByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<LeadRecord | null> {
    const result = await this.pool.query<LeadRow>(
      `SELECT * FROM leads
       WHERE workspace_id = $1 AND idempotency_key = $2 AND deleted_at IS NULL`,
      [workspaceId, idempotencyKey],
    );
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }

  async findByExternalId(workspaceId: string, externalId: string): Promise<LeadRecord | null> {
    const result = await this.pool.query<LeadRow>(
      `SELECT * FROM leads
       WHERE workspace_id = $1 AND external_id = $2 AND deleted_at IS NULL`,
      [workspaceId, externalId],
    );
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }

  async create(
    workspaceId: string,
    input: Required<LeadUpsertInput>,
  ): Promise<{ lead: LeadRecord; created: boolean }> {
    try {
      const result = await this.pool.query<LeadRow>(
        `INSERT INTO leads (
           workspace_id, name, email, phone, intent, qualification_score, qualification_max,
           sentiment, status, tags, source, captured_fields, notes, conversation_id,
           external_id, idempotency_key, captured_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17
         )
         RETURNING *`,
        [
          workspaceId,
          input.name,
          input.email,
          input.phone,
          input.intent,
          input.qualificationScore,
          input.qualificationMax,
          input.sentiment,
          input.status,
          input.tags,
          input.source,
          JSON.stringify(input.capturedFields),
          input.notes,
          input.conversationId,
          input.externalId,
          input.idempotencyKey,
          input.capturedAt,
        ],
      );
      return { lead: mapLead(result.rows[0]), created: true };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "23505") {
        if (input.idempotencyKey) {
          const existing = await this.findByIdempotencyKey(workspaceId, input.idempotencyKey);
          if (existing) return { lead: existing, created: false };
        }
        if (input.externalId) {
          const existing = await this.findByExternalId(workspaceId, input.externalId);
          if (existing) return { lead: existing, created: false };
        }
      }
      throw err;
    }
  }

  async update(
    workspaceId: string,
    leadId: string,
    expectedVersion: number,
    patch: Partial<LeadUpsertInput> & { capturedFields?: CapturedFields },
  ): Promise<LeadRecord> {
    const result = await this.pool.query<LeadRow>(
      `UPDATE leads
       SET name = COALESCE($4, name),
           email = COALESCE($5, email),
           phone = COALESCE($6, phone),
           intent = COALESCE($7, intent),
           qualification_score = COALESCE($8, qualification_score),
           qualification_max = COALESCE($9, qualification_max),
           sentiment = COALESCE($10, sentiment),
           status = COALESCE($11, status),
           tags = COALESCE($12, tags),
           source = COALESCE($13, source),
           captured_fields = COALESCE($14::jsonb, captured_fields),
           notes = COALESCE($15, notes),
           conversation_id = COALESCE($16, conversation_id),
           external_id = COALESCE($17, external_id),
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL AND version = $3
       RETURNING *`,
      [
        leadId,
        workspaceId,
        expectedVersion,
        patch.name ?? null,
        patch.email ?? null,
        patch.phone ?? null,
        patch.intent ?? null,
        patch.qualificationScore ?? null,
        patch.qualificationMax ?? null,
        patch.sentiment ?? null,
        patch.status ?? null,
        patch.tags ?? null,
        patch.source ?? null,
        patch.capturedFields ? JSON.stringify(patch.capturedFields) : null,
        patch.notes ?? null,
        patch.conversationId ?? null,
        patch.externalId ?? null,
      ],
    );
    if (!result.rows[0]) {
      const existing = await this.get(workspaceId, leadId);
      if (!existing) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Lead not found" });
      }
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Lead version conflict; refresh and retry",
      });
    }
    return mapLead(result.rows[0]);
  }
}
