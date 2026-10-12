import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export type CampaignState = "draft" | "scheduled" | "running" | "paused" | "completed";
export type TargetStatus = "pending" | "dialing" | "completed" | "failed" | "skipped";

export type CampaignRow = {
  id: string;
  workspace_id: string;
  name: string;
  agent_id: string;
  state: CampaignState;
  concurrency_cap: number;
  telephony_provider: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CampaignTargetRow = {
  id: string;
  campaign_id: string;
  workspace_id: string;
  phone_e164: string;
  status: TargetStatus;
  idempotency_key: string;
  call_id: string | null;
  last_error: string | null;
};

export interface CampaignsRepository {
  create(input: {
    workspaceId: string;
    name: string;
    agentId: string;
    concurrencyCap?: number;
    telephonyProvider?: string | null;
  }): Promise<CampaignRow>;
  get(workspaceId: string, campaignId: string): Promise<CampaignRow | null>;
  list(workspaceId: string): Promise<CampaignRow[]>;
  setState(workspaceId: string, campaignId: string, state: CampaignState): Promise<CampaignRow | null>;
  addTargets(
    workspaceId: string,
    campaignId: string,
    phones: string[],
  ): Promise<CampaignTargetRow[]>;
  claimBatch(workspaceId: string, campaignId: string, limit: number): Promise<CampaignTargetRow[]>;
  markTarget(
    workspaceId: string,
    targetId: string,
    patch: { status: TargetStatus; callId?: string | null; lastError?: string | null },
  ): Promise<void>;
}

export class PgCampaignsRepository implements CampaignsRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: {
    workspaceId: string;
    name: string;
    agentId: string;
    concurrencyCap?: number;
    telephonyProvider?: string | null;
  }): Promise<CampaignRow> {
    const id = randomUUID();
    const { rows } = await this.pool.query<CampaignRow>(
      `INSERT INTO voice_campaigns (id, workspace_id, name, agent_id, concurrency_cap, telephony_provider)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        id,
        input.workspaceId,
        input.name,
        input.agentId,
        input.concurrencyCap ?? 5,
        input.telephonyProvider ?? null,
      ],
    );
    return rows[0];
  }

  async get(workspaceId: string, campaignId: string): Promise<CampaignRow | null> {
    const { rows } = await this.pool.query<CampaignRow>(
      `SELECT * FROM voice_campaigns WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, campaignId],
    );
    return rows[0] ?? null;
  }

  async list(workspaceId: string): Promise<CampaignRow[]> {
    const { rows } = await this.pool.query<CampaignRow>(
      `SELECT * FROM voice_campaigns WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [workspaceId],
    );
    return rows;
  }

  async setState(workspaceId: string, campaignId: string, state: CampaignState): Promise<CampaignRow | null> {
    const { rows } = await this.pool.query<CampaignRow>(
      `UPDATE voice_campaigns SET state = $3, updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2 RETURNING *`,
      [workspaceId, campaignId, state],
    );
    return rows[0] ?? null;
  }

  async addTargets(workspaceId: string, campaignId: string, phones: string[]): Promise<CampaignTargetRow[]> {
    const out: CampaignTargetRow[] = [];
    for (const phone of phones) {
      const id = randomUUID();
      const key = `${campaignId}:${phone}`;
      const { rows } = await this.pool.query<CampaignTargetRow>(
        `INSERT INTO voice_campaign_targets (
          id, campaign_id, workspace_id, phone_e164, idempotency_key
        ) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (workspace_id, idempotency_key) DO UPDATE SET updated_at = NOW()
        RETURNING *`,
        [id, campaignId, workspaceId, phone, key],
      );
      out.push(rows[0]);
    }
    return out;
  }

  async claimBatch(workspaceId: string, campaignId: string, limit: number): Promise<CampaignTargetRow[]> {
    const { rows } = await this.pool.query<CampaignTargetRow>(
      `UPDATE voice_campaign_targets SET status = 'dialing', updated_at = NOW()
       WHERE id IN (
         SELECT id FROM voice_campaign_targets
         WHERE workspace_id = $1 AND campaign_id = $2 AND status = 'pending'
         ORDER BY created_at ASC
         LIMIT $3
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [workspaceId, campaignId, limit],
    );
    return rows;
  }

  async markTarget(
    workspaceId: string,
    targetId: string,
    patch: { status: TargetStatus; callId?: string | null; lastError?: string | null },
  ): Promise<void> {
    await this.pool.query(
      `UPDATE voice_campaign_targets SET
        status = $3,
        call_id = COALESCE($4, call_id),
        last_error = COALESCE($5, last_error),
        updated_at = NOW()
       WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, targetId, patch.status, patch.callId ?? null, patch.lastError ?? null],
    );
  }
}

export class MemoryCampaignsRepository implements CampaignsRepository {
  private campaigns = new Map<string, CampaignRow>();
  private targets = new Map<string, CampaignTargetRow>();

  async create(input: {
    workspaceId: string;
    name: string;
    agentId: string;
    concurrencyCap?: number;
    telephonyProvider?: string | null;
  }): Promise<CampaignRow> {
    const row: CampaignRow = {
      id: randomUUID(),
      workspace_id: input.workspaceId,
      name: input.name,
      agent_id: input.agentId,
      state: "draft",
      concurrency_cap: input.concurrencyCap ?? 5,
      telephony_provider: input.telephonyProvider ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.campaigns.set(row.id, row);
    return { ...row };
  }

  async get(workspaceId: string, campaignId: string): Promise<CampaignRow | null> {
    const row = this.campaigns.get(campaignId);
    if (!row || row.workspace_id !== workspaceId) return null;
    return { ...row };
  }

  async list(workspaceId: string): Promise<CampaignRow[]> {
    return [...this.campaigns.values()].filter((c) => c.workspace_id === workspaceId);
  }

  async setState(workspaceId: string, campaignId: string, state: CampaignState): Promise<CampaignRow | null> {
    const row = this.campaigns.get(campaignId);
    if (!row || row.workspace_id !== workspaceId) return null;
    row.state = state;
    row.updated_at = new Date();
    return { ...row };
  }

  async addTargets(workspaceId: string, campaignId: string, phones: string[]): Promise<CampaignTargetRow[]> {
    const out: CampaignTargetRow[] = [];
    for (const phone of phones) {
      const row: CampaignTargetRow = {
        id: randomUUID(),
        campaign_id: campaignId,
        workspace_id: workspaceId,
        phone_e164: phone,
        status: "pending",
        idempotency_key: `${campaignId}:${phone}`,
        call_id: null,
        last_error: null,
      };
      this.targets.set(row.id, row);
      out.push({ ...row });
    }
    return out;
  }

  async claimBatch(workspaceId: string, campaignId: string, limit: number): Promise<CampaignTargetRow[]> {
    const pending = [...this.targets.values()]
      .filter(
        (t) =>
          t.workspace_id === workspaceId &&
          t.campaign_id === campaignId &&
          t.status === "pending",
      )
      .slice(0, limit);
    for (const t of pending) t.status = "dialing";
    return pending.map((t) => ({ ...t }));
  }

  async markTarget(
    workspaceId: string,
    targetId: string,
    patch: { status: TargetStatus; callId?: string | null; lastError?: string | null },
  ): Promise<void> {
    const t = this.targets.get(targetId);
    if (!t || t.workspace_id !== workspaceId) return;
    t.status = patch.status;
    if (patch.callId !== undefined) t.call_id = patch.callId;
    if (patch.lastError !== undefined) t.last_error = patch.lastError;
  }
}
