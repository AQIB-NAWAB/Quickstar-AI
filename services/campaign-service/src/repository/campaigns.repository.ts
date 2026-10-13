import { AppError, ErrorCode } from "@quickstart/errors";
import type { Pool, PoolClient } from "pg";
import type {
  AudienceFieldDef,
  CampaignAttempt,
  CampaignMetrics,
  CampaignPacing,
  CampaignRecord,
  CampaignRetryPolicy,
  CampaignSchedule,
  CampaignStatus,
  CampaignSummary,
  CampaignTarget,
  TargetStatus,
} from "../domain/types.js";

type CampaignRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  agent_id: string;
  agent_name: string;
  status: CampaignStatus;
  audience_schema: AudienceFieldDef[] | string;
  schedule: CampaignSchedule | string;
  pacing: CampaignPacing | string;
  retry_policy: CampaignRetryPolicy | string;
  idempotency_key: string | null;
  version: number;
  scheduled_start: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type TargetRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  dial_address: string;
  dial_normalized: string;
  display_name: string | null;
  email: string | null;
  attributes: Record<string, string> | string;
  source_kind: "csv" | "lead" | "api";
  source_ref: string | null;
  status: TargetStatus;
  attempts_count: number;
  last_attempt_at: Date | null;
  next_attempt_at: Date | null;
  outcome: string | null;
  claimed_at: Date | null;
  claimed_by: string | null;
  created_at: Date;
  updated_at: Date;
};

type AttemptRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  target_id: string;
  attempt_number: number;
  idempotency_key: string;
  call_id: string | null;
  status: CampaignAttempt["status"];
  outcome: string;
  started_at: Date;
  ended_at: Date | null;
  duration_seconds: number | null;
  error: { code: string; message: string } | string | null;
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

function mapCampaign(row: CampaignRow): CampaignRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    agentId: row.agent_id,
    agentName: row.agent_name,
    status: row.status,
    audienceSchema: parseJson(row.audience_schema, []),
    schedule: parseJson(row.schedule, {
      startDate: "",
      startTime: "09:00",
      timezone: "UTC",
      dailyWindowFrom: "09:00",
      dailyWindowTo: "17:00",
    }),
    pacing: parseJson(row.pacing, { maxConcurrentCalls: 5, maxCallStartsPerMinute: 30 }),
    retryPolicy: parseJson(row.retry_policy, {
      maxRetries: 2,
      retryIntervalMinutes: 30,
      eligibleOutcomes: ["no_answer", "busy"],
    }),
    idempotencyKey: row.idempotency_key,
    version: row.version,
    scheduledStart: row.scheduled_start,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTarget(row: TargetRow): CampaignTarget {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id,
    dialAddress: row.dial_address,
    dialNormalized: row.dial_normalized,
    displayName: row.display_name,
    email: row.email,
    attributes: parseJson(row.attributes, {}),
    sourceKind: row.source_kind,
    sourceRef: row.source_ref,
    status: row.status,
    attemptsCount: row.attempts_count,
    lastAttemptAt: row.last_attempt_at,
    nextAttemptAt: row.next_attempt_at,
    outcome: row.outcome,
    claimedAt: row.claimed_at,
    claimedBy: row.claimed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttempt(row: AttemptRow): CampaignAttempt {
  const error = parseJson(row.error, null);
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id,
    targetId: row.target_id,
    attemptNumber: row.attempt_number,
    idempotencyKey: row.idempotency_key,
    callId: row.call_id,
    status: row.status,
    outcome: row.outcome,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    error: error && typeof error === "object" ? error : null,
  };
}

export class CampaignsRepository {
  constructor(private readonly pool: Pool) {}

  async list(
    workspaceId: string,
    filters?: { q?: string; status?: string },
  ): Promise<CampaignSummary[]> {
    const params: unknown[] = [workspaceId];
    const clauses = ["workspace_id = $1", "deleted_at IS NULL"];
    if (filters?.status && filters.status !== "all") {
      params.push(filters.status);
      clauses.push(`status = $${params.length}`);
    }
    if (filters?.q?.trim()) {
      params.push(`%${filters.q.trim().toLowerCase()}%`);
      clauses.push(`lower(name) LIKE $${params.length}`);
    }

    const result = await this.pool.query<
      CampaignRow & {
        eligible_contacts: string;
        completed_contacts: string;
        answered_contacts: string;
      }
    >(
      `SELECT c.*,
          COALESCE(stats.eligible, 0)::text AS eligible_contacts,
          COALESCE(stats.completed, 0)::text AS completed_contacts,
          COALESCE(stats.answered, 0)::text AS answered_contacts
       FROM campaigns c
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*)::int AS eligible,
           COUNT(*) FILTER (WHERE status IN ('answered','completed','failed','opted_out','no_answer','busy','voicemail'))::int AS completed,
           COUNT(*) FILTER (WHERE status IN ('answered','completed'))::int AS answered
         FROM campaign_targets t
         WHERE t.campaign_id = c.id
       ) stats ON TRUE
       WHERE ${clauses.join(" AND ")}
       ORDER BY c.updated_at DESC
       LIMIT 200`,
      params,
    );

    return result.rows.map((row) => {
      const eligible = Number(row.eligible_contacts);
      const answered = Number(row.answered_contacts);
      return {
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        description: row.description,
        agentId: row.agent_id,
        agentName: row.agent_name,
        status: row.status,
        eligibleContacts: eligible,
        completedContacts: Number(row.completed_contacts),
        answerRate: eligible > 0 ? Math.round((answered / eligible) * 100) : null,
        scheduledStart: row.scheduled_start?.toISOString() ?? null,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        version: row.version,
      };
    });
  }

  async get(workspaceId: string, campaignId: string): Promise<CampaignRecord | null> {
    const result = await this.pool.query<CampaignRow>(
      `SELECT * FROM campaigns
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [campaignId, workspaceId],
    );
    return result.rows[0] ? mapCampaign(result.rows[0]) : null;
  }

  async getByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<CampaignRecord | null> {
    const result = await this.pool.query<CampaignRow>(
      `SELECT * FROM campaigns
       WHERE workspace_id = $1 AND idempotency_key = $2 AND deleted_at IS NULL`,
      [workspaceId, idempotencyKey],
    );
    return result.rows[0] ? mapCampaign(result.rows[0]) : null;
  }

  async create(input: {
    workspaceId: string;
    name: string;
    description: string | null;
    agentId: string;
    agentName: string;
    status: CampaignStatus;
    audienceSchema: AudienceFieldDef[];
    schedule: CampaignSchedule;
    pacing: CampaignPacing;
    retryPolicy: CampaignRetryPolicy;
    idempotencyKey: string | null;
    scheduledStart: Date | null;
  }): Promise<CampaignRecord> {
    try {
      const result = await this.pool.query<CampaignRow>(
        `INSERT INTO campaigns (
           workspace_id, name, description, agent_id, agent_name, status,
           audience_schema, schedule, pacing, retry_policy, idempotency_key, scheduled_start
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12)
         RETURNING *`,
        [
          input.workspaceId,
          input.name,
          input.description,
          input.agentId,
          input.agentName,
          input.status,
          JSON.stringify(input.audienceSchema),
          JSON.stringify(input.schedule),
          JSON.stringify(input.pacing),
          JSON.stringify(input.retryPolicy),
          input.idempotencyKey,
          input.scheduledStart,
        ],
      );
      return mapCampaign(result.rows[0]);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "23505" && input.idempotencyKey) {
        const existing = await this.getByIdempotencyKey(input.workspaceId, input.idempotencyKey);
        if (existing) return existing;
      }
      throw err;
    }
  }

  async updateStatus(
    workspaceId: string,
    campaignId: string,
    expectedVersion: number,
    next: {
      status: CampaignStatus;
      startedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<CampaignRecord> {
    const result = await this.pool.query<CampaignRow>(
      `UPDATE campaigns
       SET status = $4,
           started_at = COALESCE($5, started_at),
           completed_at = COALESCE($6, completed_at),
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL AND version = $3
       RETURNING *`,
      [
        campaignId,
        workspaceId,
        expectedVersion,
        next.status,
        next.startedAt ?? null,
        next.completedAt ?? null,
      ],
    );
    if (!result.rows[0]) {
      const existing = await this.get(workspaceId, campaignId);
      if (!existing) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Campaign not found" });
      }
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Campaign version conflict; refresh and retry",
      });
    }
    return mapCampaign(result.rows[0]);
  }

  async insertTargets(
    workspaceId: string,
    campaignId: string,
    targets: Array<{
      dialAddress: string;
      dialNormalized: string;
      displayName: string | null;
      email: string | null;
      attributes: Record<string, string>;
      sourceKind: "csv" | "lead" | "api";
      sourceRef: string | null;
    }>,
  ): Promise<number> {
    if (targets.length === 0) return 0;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      let inserted = 0;
      for (const t of targets) {
        const result = await client.query(
          `INSERT INTO campaign_targets (
             workspace_id, campaign_id, dial_address, dial_normalized, display_name, email,
             attributes, source_kind, source_ref
           ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
           ON CONFLICT (campaign_id, dial_normalized) DO NOTHING`,
          [
            workspaceId,
            campaignId,
            t.dialAddress,
            t.dialNormalized,
            t.displayName,
            t.email,
            JSON.stringify(t.attributes),
            t.sourceKind,
            t.sourceRef,
          ],
        );
        inserted += result.rowCount ?? 0;
      }
      await client.query("COMMIT");
      return inserted;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async listTargets(
    workspaceId: string,
    campaignId: string,
    filters?: { q?: string; status?: string },
  ): Promise<CampaignTarget[]> {
    const params: unknown[] = [workspaceId, campaignId];
    const clauses = ["workspace_id = $1", "campaign_id = $2"];
    if (filters?.status && filters.status !== "all") {
      params.push(filters.status);
      clauses.push(`status = $${params.length}`);
    }
    if (filters?.q?.trim()) {
      params.push(`%${filters.q.trim().toLowerCase()}%`);
      clauses.push(
        `(lower(COALESCE(display_name,'')) LIKE $${params.length} OR dial_address LIKE $${params.length} OR lower(COALESCE(email,'')) LIKE $${params.length})`,
      );
    }
    const result = await this.pool.query<TargetRow>(
      `SELECT * FROM campaign_targets
       WHERE ${clauses.join(" AND ")}
       ORDER BY created_at ASC
       LIMIT 500`,
      params,
    );
    return result.rows.map(mapTarget);
  }

  async getTarget(
    workspaceId: string,
    campaignId: string,
    targetId: string,
  ): Promise<CampaignTarget | null> {
    const result = await this.pool.query<TargetRow>(
      `SELECT * FROM campaign_targets
       WHERE id = $1 AND campaign_id = $2 AND workspace_id = $3`,
      [targetId, campaignId, workspaceId],
    );
    return result.rows[0] ? mapTarget(result.rows[0]) : null;
  }

  async listAttempts(workspaceId: string, campaignId: string): Promise<CampaignAttempt[]> {
    const result = await this.pool.query<AttemptRow>(
      `SELECT * FROM campaign_attempts
       WHERE workspace_id = $1 AND campaign_id = $2
       ORDER BY started_at DESC
       LIMIT 500`,
      [workspaceId, campaignId],
    );
    return result.rows.map(mapAttempt);
  }

  async listAttemptsForTarget(
    workspaceId: string,
    campaignId: string,
    targetId: string,
  ): Promise<CampaignAttempt[]> {
    const result = await this.pool.query<AttemptRow>(
      `SELECT * FROM campaign_attempts
       WHERE workspace_id = $1 AND campaign_id = $2 AND target_id = $3
       ORDER BY attempt_number ASC`,
      [workspaceId, campaignId, targetId],
    );
    return result.rows.map(mapAttempt);
  }

  async metrics(workspaceId: string, campaignId: string): Promise<CampaignMetrics> {
    const result = await this.pool.query<{
      eligible: string;
      completed: string;
      answered: string;
      active: string;
      queued: string;
      retrying: string;
      attempts: string;
      avg_duration: string | null;
    }>(
      `SELECT
         COUNT(*)::text AS eligible,
         COUNT(*) FILTER (WHERE status IN ('answered','completed','failed','opted_out','no_answer','busy','voicemail'))::text AS completed,
         COUNT(*) FILTER (WHERE status IN ('answered','completed'))::text AS answered,
         COUNT(*) FILTER (WHERE status = 'calling')::text AS active,
         COUNT(*) FILTER (WHERE status IN ('pending','queued'))::text AS queued,
         COUNT(*) FILTER (WHERE status = 'retrying')::text AS retrying,
         (SELECT COUNT(*)::text FROM campaign_attempts a WHERE a.campaign_id = $2 AND a.workspace_id = $1) AS attempts,
         (SELECT AVG(duration_seconds)::text FROM campaign_attempts a
            WHERE a.campaign_id = $2 AND a.workspace_id = $1 AND a.status = 'answered' AND a.duration_seconds IS NOT NULL) AS avg_duration
       FROM campaign_targets
       WHERE workspace_id = $1 AND campaign_id = $2`,
      [workspaceId, campaignId],
    );
    const row = result.rows[0];
    const eligible = Number(row?.eligible ?? 0);
    const answered = Number(row?.answered ?? 0);
    return {
      eligibleContacts: eligible,
      completedContacts: Number(row?.completed ?? 0),
      answeredContacts: answered,
      answerRate: eligible > 0 ? Math.round((answered / eligible) * 100) : 0,
      avgAnsweredDurationSeconds: Math.round(Number(row?.avg_duration ?? 0)),
      activeCalls: Number(row?.active ?? 0),
      queuedContacts: Number(row?.queued ?? 0),
      retryingContacts: Number(row?.retrying ?? 0),
      startedAttempts: Number(row?.attempts ?? 0),
    };
  }

  async countTargets(workspaceId: string, campaignId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM campaign_targets
       WHERE workspace_id = $1 AND campaign_id = $2`,
      [workspaceId, campaignId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async claimTargets(workerId: string, batchSize: number): Promise<CampaignTarget[]> {
    const claimed: CampaignTarget[] = [];
    // Claim one row at a time so maxConcurrentCalls sees updated 'calling' counts
    // within the same worker batch (light pacing).
    for (let i = 0; i < batchSize; i += 1) {
      const one = await this.claimOneTarget(workerId);
      if (!one) break;
      claimed.push(one);
    }
    return claimed;
  }

  private async claimOneTarget(workerId: string): Promise<CampaignTarget | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // SKIP LOCKED + per-campaign maxConcurrentCalls (count of status=calling).
      const result = await client.query<TargetRow>(
        `WITH candidate AS (
           SELECT t.id
           FROM campaign_targets t
           INNER JOIN campaigns c ON c.id = t.campaign_id
           WHERE c.status = 'running'
             AND c.deleted_at IS NULL
             AND t.status IN ('pending', 'retrying')
             AND (t.next_attempt_at IS NULL OR t.next_attempt_at <= NOW())
             AND (t.claimed_at IS NULL OR t.claimed_at < NOW() - INTERVAL '5 minutes')
             AND (
               SELECT COUNT(*)::int
               FROM campaign_targets active
               WHERE active.campaign_id = t.campaign_id
                 AND active.status = 'calling'
             ) < COALESCE((c.pacing->>'maxConcurrentCalls')::int, 5)
           ORDER BY t.next_attempt_at NULLS FIRST, t.created_at ASC
           FOR UPDATE OF t SKIP LOCKED
           LIMIT 1
         )
         UPDATE campaign_targets t
         SET status = 'calling',
             claimed_at = NOW(),
             claimed_by = $1,
             updated_at = NOW()
         FROM candidate
         WHERE t.id = candidate.id
         RETURNING t.*`,
        [workerId],
      );
      await client.query("COMMIT");
      return result.rows[0] ? mapTarget(result.rows[0]) : null;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async createAttempt(input: {
    workspaceId: string;
    campaignId: string;
    targetId: string;
    attemptNumber: number;
    idempotencyKey: string;
  }): Promise<CampaignAttempt> {
    try {
      const result = await this.pool.query<AttemptRow>(
        `INSERT INTO campaign_attempts (
           workspace_id, campaign_id, target_id, attempt_number, idempotency_key, status, outcome
         ) VALUES ($1,$2,$3,$4,$5,'in_progress','')
         RETURNING *`,
        [
          input.workspaceId,
          input.campaignId,
          input.targetId,
          input.attemptNumber,
          input.idempotencyKey,
        ],
      );
      return mapAttempt(result.rows[0]);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "23505") {
        const existing = await this.pool.query<AttemptRow>(
          `SELECT * FROM campaign_attempts WHERE idempotency_key = $1`,
          [input.idempotencyKey],
        );
        if (existing.rows[0]) return mapAttempt(existing.rows[0]);
      }
      throw err;
    }
  }

  async completeAttempt(input: {
    attemptId: string;
    status: CampaignAttempt["status"];
    outcome: string;
    callId?: string | null;
    durationSeconds?: number | null;
    error?: { code: string; message: string } | null;
  }): Promise<CampaignAttempt> {
    const result = await this.pool.query<AttemptRow>(
      `UPDATE campaign_attempts
       SET status = $2,
           outcome = $3,
           call_id = COALESCE($4, call_id),
           ended_at = NOW(),
           duration_seconds = $5,
           error = $6::jsonb
       WHERE id = $1
       RETURNING *`,
      [
        input.attemptId,
        input.status,
        input.outcome,
        input.callId ?? null,
        input.durationSeconds ?? null,
        input.error ? JSON.stringify(input.error) : null,
      ],
    );
    return mapAttempt(result.rows[0]);
  }

  async completeTargetAttempt(input: {
    targetId: string;
    nextStatus: TargetStatus;
    outcome: string;
    nextAttemptAt: Date | null;
  }): Promise<void> {
    await this.pool.query(
      `UPDATE campaign_targets
       SET status = $2,
           outcome = $3,
           attempts_count = attempts_count + 1,
           last_attempt_at = NOW(),
           next_attempt_at = $4,
           claimed_at = NULL,
           claimed_by = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [input.targetId, input.nextStatus, input.outcome, input.nextAttemptAt],
    );
  }

  async getCampaignForTarget(targetId: string): Promise<CampaignRecord | null> {
    const result = await this.pool.query<CampaignRow>(
      `SELECT c.* FROM campaigns c
       INNER JOIN campaign_targets t ON t.campaign_id = c.id
       WHERE t.id = $1 AND c.deleted_at IS NULL`,
      [targetId],
    );
    return result.rows[0] ? mapCampaign(result.rows[0]) : null;
  }

  async maybeCompleteCampaign(workspaceId: string, campaignId: string): Promise<boolean> {
    const result = await this.pool.query<{ remaining: string }>(
      `SELECT COUNT(*)::text AS remaining
       FROM campaign_targets
       WHERE workspace_id = $1 AND campaign_id = $2
         AND status IN ('pending','queued','calling','retrying')`,
      [workspaceId, campaignId],
    );
    if (Number(result.rows[0]?.remaining ?? 0) > 0) return false;
    await this.pool.query(
      `UPDATE campaigns
       SET status = 'completed', completed_at = NOW(), version = version + 1, updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND status = 'running' AND deleted_at IS NULL`,
      [campaignId, workspaceId],
    );
    return true;
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const value = await fn(client);
      await client.query("COMMIT");
      return value;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
