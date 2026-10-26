import type { Pool } from "pg";

export type SmtpMailboxRow = {
  id: string;
  workspace_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  secret_reference_id: string;
  status: string;
  daily_limit: number;
  sent_date: string | null;
  sent_today: number;
  last_verified_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type SmtpEmailCampaignRow = {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  mode: string;
  mailbox_id: string | null;
  from_name: string | null;
  subject: string | null;
  preview_text: string | null;
  html: string | null;
  brief: string | null;
  schedule: {
    sendAt?: string;
    followUps?: Array<{
      delayDays: number;
      mode?: "generic" | "personalized";
      subject?: string;
      html?: string;
      brief?: string;
    }>;
  };
  scheduled_start_at: Date | null;
  recipients_fixed: boolean;
  consent_confirmed: boolean;
  followup_step: number;
  created_by: string | null;
  activated_at: Date | null;
  paused_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  last_error: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
};

export type SmtpEmailRecipientRow = {
  id: string;
  campaign_id: string;
  email: string;
  name: string | null;
  company: string | null;
  website: string | null;
  category: string | null;
  location: string | null;
  summary: string | null;
  notes: string | null;
  lead: Record<string, unknown>;
  status: string;
  personalized: { subject?: string; html?: string; source?: string } | null;
  sent_subject: string | null;
  sent_html: string | null;
  followup_step: number;
  next_send_at: Date | null;
  claimed_at: Date | null;
  claimed_by: string | null;
  lease_expires_at: Date | null;
  attempts: number;
  message_id: string | null;
  sent_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export type SmtpActivityRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  type: string;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
};

export type SmtpSuppressionRow = {
  workspace_id: string;
  email: string;
  reason: string;
  created_at: Date;
  updated_at: Date;
};

export type CampaignRecipientCounts = {
  total: number;
  pending: number;
  retrying: number;
  sent: number;
  suppressed: number;
  failed: number;
  opted_out: number;
  skipped: number;
};

export type RecipientClaimRow = SmtpEmailRecipientRow & {
  workspace_id: string;
  campaign_status: string;
  campaign_mode: string;
  campaign_name: string;
  campaign_brief: string | null;
  campaign_subject: string | null;
  campaign_html: string | null;
  campaign_from_name: string | null;
  campaign_schedule: SmtpEmailCampaignRow["schedule"];
  mailbox_id: string | null;
  mailbox_email: string | null;
  mailbox_daily_limit: number | null;
  mailbox_sent_today: number | null;
  mailbox_sent_date: string | null;
};

export type RecipientInput = {
  email: string;
  name?: string;
  company?: string;
  website?: string;
  category?: string;
  location?: string;
  summary?: string;
  notes?: string;
  lead?: Record<string, unknown>;
};

export class EmailCampaignsRepository {
  constructor(private readonly pool: Pool) {}

  // ---------------------------------------------------------------- mailboxes

  async createMailbox(params: {
    id: string;
    workspaceId: string;
    email: string;
    firstName: string;
    lastName: string;
    secretReferenceId: string;
    dailyLimit: number;
  }): Promise<SmtpMailboxRow> {
    const res = await this.pool.query<SmtpMailboxRow>(
      `INSERT INTO smtp_mailboxes (
         id, workspace_id, email, first_name, last_name, secret_reference_id, daily_limit
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        params.id,
        params.workspaceId,
        params.email,
        params.firstName,
        params.lastName,
        params.secretReferenceId,
        params.dailyLimit,
      ],
    );
    return res.rows[0];
  }

  async getMailbox(workspaceId: string, mailboxId: string): Promise<SmtpMailboxRow | null> {
    const res = await this.pool.query<SmtpMailboxRow>(
      `SELECT * FROM smtp_mailboxes WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, mailboxId],
    );
    return res.rows[0] ?? null;
  }

  async getMailboxByEmail(workspaceId: string, email: string): Promise<SmtpMailboxRow | null> {
    const res = await this.pool.query<SmtpMailboxRow>(
      `SELECT * FROM smtp_mailboxes WHERE workspace_id = $1 AND email = $2`,
      [workspaceId, email],
    );
    return res.rows[0] ?? null;
  }

  async listMailboxes(workspaceId: string): Promise<SmtpMailboxRow[]> {
    const res = await this.pool.query<SmtpMailboxRow>(
      `SELECT * FROM smtp_mailboxes WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [workspaceId],
    );
    return res.rows;
  }

  async deleteMailbox(workspaceId: string, mailboxId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM smtp_mailboxes WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, mailboxId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async markMailboxVerified(workspaceId: string, mailboxId: string, error?: string | null): Promise<void> {
    await this.pool.query(
      `UPDATE smtp_mailboxes
       SET last_verified_at = now(), last_error = $3, updated_at = now()
       WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, mailboxId, error ?? null],
    );
  }

  async resetMailboxDailyCounterIfStale(mailboxId: string): Promise<void> {
    await this.pool.query(
      `UPDATE smtp_mailboxes
       SET sent_date = CURRENT_DATE, sent_today = 0, updated_at = now()
       WHERE id = $1 AND (sent_date IS NULL OR sent_date <> CURRENT_DATE)`,
      [mailboxId],
    );
  }

  async incrementMailboxSent(mailboxId: string): Promise<void> {
    await this.pool.query(
      `UPDATE smtp_mailboxes
       SET sent_today = sent_today + 1, updated_at = now()
       WHERE id = $1`,
      [mailboxId],
    );
  }

  // ---------------------------------------------------------------- campaigns

  async createCampaign(params: {
    id: string;
    workspaceId: string;
    name: string;
    mode: string;
    mailboxId: string;
    fromName: string;
    subject?: string | null;
    previewText?: string | null;
    html?: string | null;
    brief?: string | null;
    schedule: SmtpEmailCampaignRow["schedule"];
    consentConfirmed: boolean;
    createdBy?: string | null;
    scheduledStartAt?: Date | null;
  }): Promise<SmtpEmailCampaignRow> {
    const res = await this.pool.query<SmtpEmailCampaignRow>(
      `INSERT INTO smtp_email_campaigns (
         id, workspace_id, name, status, mode, mailbox_id, from_name, subject,
         preview_text, html, brief, schedule, consent_confirmed, created_by,
         scheduled_start_at
       ) VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14)
       RETURNING *`,
      [
        params.id,
        params.workspaceId,
        params.name,
        params.mode,
        params.mailboxId,
        params.fromName,
        params.subject ?? null,
        params.previewText ?? null,
        params.html ?? null,
        params.brief ?? null,
        JSON.stringify(params.schedule),
        params.consentConfirmed,
        params.createdBy ?? null,
        params.scheduledStartAt ?? null,
      ],
    );
    return res.rows[0];
  }

  async getCampaign(workspaceId: string, campaignId: string): Promise<SmtpEmailCampaignRow | null> {
    const res = await this.pool.query<SmtpEmailCampaignRow>(
      `SELECT * FROM smtp_email_campaigns WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, campaignId],
    );
    return res.rows[0] ?? null;
  }

  async listCampaigns(workspaceId: string): Promise<
    Array<SmtpEmailCampaignRow & CampaignRecipientCounts>
  > {
    const res = await this.pool.query<
      SmtpEmailCampaignRow & CampaignRecipientCounts
    >(
      `SELECT c.*,
         COALESCE(r.total, 0)::int AS total,
         COALESCE(r.pending, 0)::int AS pending,
         COALESCE(r.retrying, 0)::int AS retrying,
         COALESCE(r.sent, 0)::int AS sent,
         COALESCE(r.suppressed, 0)::int AS suppressed,
         COALESCE(r.failed, 0)::int AS failed,
         COALESCE(r.opted_out, 0)::int AS opted_out,
         COALESCE(r.skipped, 0)::int AS skipped
       FROM smtp_email_campaigns c
       LEFT JOIN (
         SELECT campaign_id,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'pending') AS pending,
           COUNT(*) FILTER (WHERE status = 'retrying') AS retrying,
           COUNT(*) FILTER (WHERE status = 'sent') AS sent,
           COUNT(*) FILTER (WHERE status = 'suppressed') AS suppressed,
           COUNT(*) FILTER (WHERE status = 'failed') AS failed,
           COUNT(*) FILTER (WHERE status = 'opted_out') AS opted_out,
           COUNT(*) FILTER (WHERE status = 'skipped') AS skipped
         FROM smtp_email_recipients
         GROUP BY campaign_id
       ) r ON r.campaign_id = c.id
       WHERE c.workspace_id = $1
       ORDER BY c.created_at DESC`,
      [workspaceId],
    );
    return res.rows;
  }

  async updateCampaignDraft(
    workspaceId: string,
    campaignId: string,
    patch: {
      name?: string;
      mailboxId?: string;
      fromName?: string;
      subject?: string | null;
      previewText?: string | null;
      html?: string | null;
      brief?: string | null;
      schedule?: SmtpEmailCampaignRow["schedule"];
      consentConfirmed?: boolean;
      scheduledStartAt?: Date | null;
    },
    expectedVersion: number,
  ): Promise<SmtpEmailCampaignRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [workspaceId, campaignId];
    const push = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };
    if (patch.name !== undefined) push("name", patch.name);
    if (patch.mailboxId !== undefined) push("mailbox_id", patch.mailboxId);
    if (patch.fromName !== undefined) push("from_name", patch.fromName);
    if (patch.subject !== undefined) push("subject", patch.subject);
    if (patch.previewText !== undefined) push("preview_text", patch.previewText);
    if (patch.html !== undefined) push("html", patch.html);
    if (patch.brief !== undefined) push("brief", patch.brief);
    if (patch.schedule !== undefined) push("schedule", JSON.stringify(patch.schedule));
    if (patch.consentConfirmed !== undefined) push("consent_confirmed", patch.consentConfirmed);
    if (patch.scheduledStartAt !== undefined) push("scheduled_start_at", patch.scheduledStartAt);
    if (sets.length === 0) return this.getCampaign(workspaceId, campaignId);
    values.push(expectedVersion);
    sets.push(`version = version + 1`);
    const res = await this.pool.query<SmtpEmailCampaignRow>(
      `UPDATE smtp_email_campaigns
       SET ${sets.join(", ")}, updated_at = now()
       WHERE workspace_id = $1 AND id = $2 AND status = 'draft' AND version = $${values.length}
       RETURNING *`,
      values,
    );
    return res.rows[0] ?? null;
  }

  async transitionStatus(params: {
    workspaceId: string;
    campaignId: string;
    from: string[];
    to: string;
    extra?: Record<string, unknown>;
  }): Promise<SmtpEmailCampaignRow | null> {
    const { workspaceId, campaignId, from, to, extra = {} } = params;
    const sets = [`status = $3`, `updated_at = now()`];
    const values: unknown[] = [workspaceId, campaignId, to];
    const push = (sql: string, value: unknown) => {
      values.push(value);
      sets.push(`${sql} = $${values.length}`);
    };
    for (const [key, value] of Object.entries(extra)) {
      if (["workspaceId", "campaignId", "from", "to", "extra"].includes(key)) continue;
      if (value === undefined) continue;
      push(key, value);
    }
    const res = await this.pool.query<SmtpEmailCampaignRow>(
      `UPDATE smtp_email_campaigns
       SET ${sets.join(", ")}, version = version + 1
       WHERE workspace_id = $1 AND id = $2 AND status = ANY(${`$${values.length + 1}`})
       RETURNING *`,
      [...values, from],
    );
    return res.rows[0] ?? null;
  }

  async setCampaignError(workspaceId: string, campaignId: string, error: string | null): Promise<void> {
    await this.pool.query(
      `UPDATE smtp_email_campaigns SET last_error = $3, updated_at = now()
       WHERE workspace_id = $1 AND id = $2`,
      [workspaceId, campaignId, error],
    );
  }

  /** Scheduled campaigns whose start time has passed become sending. */
  async activateScheduledCampaigns(): Promise<Array<{ id: string; workspace_id: string }>> {
    const res = await this.pool.query<{ id: string; workspace_id: string }>(
      `UPDATE smtp_email_campaigns
       SET status = 'sending', activated_at = COALESCE(activated_at, now()), updated_at = now(), version = version + 1
       WHERE status = 'scheduled' AND scheduled_start_at <= now()
       RETURNING id, workspace_id`,
    );
    return res.rows;
  }

  async listSendingCampaigns(): Promise<Array<{ id: string; workspace_id: string }>> {
    const res = await this.pool.query<{ id: string; workspace_id: string }>(
      `SELECT id, workspace_id FROM smtp_email_campaigns WHERE status = 'sending' ORDER BY created_at ASC`,
    );
    return res.rows;
  }

  /** Completes sending campaigns that have no pending/retrying recipients left. */
  async finalizeCompletedCampaigns(): Promise<Array<{ id: string; workspace_id: string }>> {
    const res = await this.pool.query<{ id: string; workspace_id: string }>(
      `UPDATE smtp_email_campaigns c
       SET status = 'completed', completed_at = now(), updated_at = now(), version = version + 1
       WHERE c.status = 'sending'
         AND NOT EXISTS (
           SELECT 1 FROM smtp_email_recipients r
           WHERE r.campaign_id = c.id AND r.status IN ('pending', 'retrying')
         )
       RETURNING c.id, c.workspace_id`,
    );
    return res.rows;
  }

  async countRecipients(campaignId: string): Promise<CampaignRecipientCounts> {
    const res = await this.pool.query<CampaignRecipientCounts>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'retrying')::int AS retrying,
         COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
         COUNT(*) FILTER (WHERE status = 'suppressed')::int AS suppressed,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
         COUNT(*) FILTER (WHERE status = 'opted_out')::int AS opted_out,
         COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped
       FROM smtp_email_recipients WHERE campaign_id = $1`,
      [campaignId],
    );
    return res.rows[0];
  }

  // -------------------------------------------------------------- recipients

  async replaceRecipients(campaignId: string, recipients: RecipientInput[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM smtp_email_recipients WHERE campaign_id = $1`, [campaignId]);
      for (const recipient of recipients) {
        await client.query(
          `INSERT INTO smtp_email_recipients (
             id, campaign_id, email, name, company, website, category, location,
             summary, notes, lead
           ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
          [
            campaignId,
            recipient.email,
            recipient.name ?? null,
            recipient.company ?? null,
            recipient.website ?? null,
            recipient.category ?? null,
            recipient.location ?? null,
            recipient.summary ?? null,
            recipient.notes ?? null,
            JSON.stringify(recipient.lead ?? {}),
          ],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listRecipients(
    campaignId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<SmtpEmailRecipientRow[]> {
    const res = await this.pool.query<SmtpEmailRecipientRow>(
      `SELECT * FROM smtp_email_recipients
       WHERE campaign_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [campaignId, options.limit ?? 500, options.offset ?? 0],
    );
    return res.rows;
  }

  async getRecipient(recipientId: string): Promise<SmtpEmailRecipientRow | null> {
    const res = await this.pool.query<SmtpEmailRecipientRow>(
      `SELECT * FROM smtp_email_recipients WHERE id = $1`,
      [recipientId],
    );
    return res.rows[0] ?? null;
  }

  async getRecipientCampaign(
    campaignId: string,
    recipientId: string,
  ): Promise<{ workspace_id: string; recipient: SmtpEmailRecipientRow } | null> {
    const res = await this.pool.query<{ workspace_id: string } & SmtpEmailRecipientRow>(
      `SELECT c.workspace_id, r.*
       FROM smtp_email_recipients r
       JOIN smtp_email_campaigns c ON c.id = r.campaign_id
       WHERE r.campaign_id = $1 AND r.id = $2`,
      [campaignId, recipientId],
    );
    if (res.rows.length === 0) return null;
    const { workspace_id, ...recipient } = res.rows[0];
    return { workspace_id, recipient };
  }

  async claimRecipients(
    campaignId: string,
    limit: number,
    workerId: string,
    leaseSeconds: number,
  ): Promise<RecipientClaimRow[]> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query<RecipientClaimRow>(
        `WITH candidates AS (
           SELECT r.*, c.workspace_id, c.status AS campaign_status, c.mode AS campaign_mode,
                  c.name AS campaign_name, c.brief AS campaign_brief, c.subject AS campaign_subject,
                  c.html AS campaign_html, c.from_name AS campaign_from_name,
                  c.schedule AS campaign_schedule,
                  m.id AS mailbox_id, m.email AS mailbox_email,
                  m.daily_limit AS mailbox_daily_limit, m.sent_today AS mailbox_sent_today,
                  m.sent_date::text AS mailbox_sent_date
           FROM smtp_email_recipients r
           JOIN smtp_email_campaigns c ON c.id = r.campaign_id
           LEFT JOIN smtp_mailboxes m ON m.id = c.mailbox_id
           WHERE r.campaign_id = $1
             AND c.status = 'sending'
             AND r.status IN ('pending', 'retrying')
             AND (r.next_send_at IS NULL OR r.next_send_at <= now())
             AND (r.claimed_at IS NULL OR r.lease_expires_at IS NULL OR r.lease_expires_at < now())
             AND (
               m.id IS NULL
               OR m.daily_limit IS NULL
               OR (m.sent_date IS NULL OR m.sent_date <> CURRENT_DATE)
               OR m.sent_today < m.daily_limit
             )
           ORDER BY r.created_at ASC
           LIMIT $2
           FOR UPDATE OF r SKIP LOCKED
         )
         UPDATE smtp_email_recipients r
         SET status = CASE WHEN r.status = 'pending' THEN 'pending' ELSE 'retrying' END,
             claimed_at = now(), claimed_by = $3,
             lease_expires_at = now() + ($4::text || ' seconds')::interval,
             updated_at = now()
         FROM candidates
         WHERE r.id = candidates.id
         RETURNING candidates.*`,
        [campaignId, limit, workerId, leaseSeconds],
      );
      await client.query("COMMIT");
      return res.rows;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markRecipientSent(params: {
    recipientId: string;
    messageId: string | null;
    sentSubject: string;
    sentHtml: string;
    nextStep: number;
    nextSendAt: Date | null;
  }): Promise<void> {
    await this.pool.query(
      `UPDATE smtp_email_recipients
       SET status = CASE WHEN $6::timestamptz IS NULL THEN 'sent' ELSE 'pending' END,
           sent_subject = $2,
           sent_html = $3,
           sent_at = now(),
           message_id = $4,
           last_error = NULL,
           followup_step = $5,
           next_send_at = $6,
           attempts = 0,
           claimed_at = NULL,
           claimed_by = NULL,
           lease_expires_at = NULL,
           updated_at = now()
       WHERE id = $1`,
      [
        params.recipientId,
        params.sentSubject,
        params.sentHtml,
        params.messageId,
        params.nextStep,
        params.nextSendAt,
      ],
    );
  }

  async markRecipientRetry(params: {
    recipientId: string;
    error: string;
    nextAttemptAt: Date;
  }): Promise<void> {
    await this.pool.query(
      `UPDATE smtp_email_recipients
       SET status = 'retrying',
           attempts = attempts + 1,
           last_error = $2,
           next_send_at = $3,
           claimed_at = NULL,
           claimed_by = NULL,
           lease_expires_at = NULL,
           updated_at = now()
       WHERE id = $1`,
      [params.recipientId, params.error, params.nextAttemptAt],
    );
  }

  async markRecipientFailed(recipientId: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE smtp_email_recipients
       SET status = 'failed',
           attempts = attempts + 1,
           last_error = $2,
           claimed_at = NULL,
           claimed_by = NULL,
           lease_expires_at = NULL,
           updated_at = now()
       WHERE id = $1`,
      [recipientId, error],
    );
  }

  async markRecipientSuppressed(recipientId: string, reason: string): Promise<void> {
    await this.pool.query(
      `UPDATE smtp_email_recipients
       SET status = 'suppressed',
           last_error = $2,
           claimed_at = NULL,
           claimed_by = NULL,
           lease_expires_at = NULL,
           updated_at = now()
       WHERE id = $1`,
      [recipientId, reason],
    );
  }

  async skipPendingRecipients(campaignId: string, reason: string): Promise<number> {
    const res = await this.pool.query(
      `UPDATE smtp_email_recipients
       SET status = 'skipped', last_error = $2, updated_at = now()
       WHERE campaign_id = $1 AND status IN ('pending', 'retrying')`,
      [campaignId, reason],
    );
    return res.rowCount ?? 0;
  }

  async setRecipientsPersonalized(
    campaignId: string,
    entries: Array<{ recipientId: string; personalized: { subject: string; html: string; source: string } }>,
  ): Promise<void> {
    if (entries.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const entry of entries) {
        await client.query(
          `UPDATE smtp_email_recipients
           SET personalized = $2::jsonb, updated_at = now()
           WHERE id = $1 AND campaign_id = $3`,
          [entry.recipientId, JSON.stringify(entry.personalized), campaignId],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async setRecipientsPendingWithStart(campaignId: string, startAt: Date): Promise<number> {
    const res = await this.pool.query(
      `UPDATE smtp_email_recipients
       SET status = 'pending', next_send_at = $2, followup_step = 0, updated_at = now()
       WHERE campaign_id = $1 AND status IN ('pending', 'retrying')`,
      [campaignId, startAt],
    );
    return res.rowCount ?? 0;
  }

  // --------------------------------------------------------------- activity

  async addActivity(params: {
    workspaceId: string;
    campaignId: string;
    type: string;
    message?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO smtp_email_activity (id, workspace_id, campaign_id, type, message, metadata)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::jsonb)`,
      [
        params.workspaceId,
        params.campaignId,
        params.type,
        params.message ?? null,
        JSON.stringify(params.metadata ?? {}),
      ],
    );
  }

  async listActivity(campaignId: string, limit = 200): Promise<SmtpActivityRow[]> {
    const res = await this.pool.query<SmtpActivityRow>(
      `SELECT * FROM smtp_email_activity
       WHERE campaign_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [campaignId, limit],
    );
    return res.rows;
  }

  // ------------------------------------------------------------ suppressions

  async upsertSuppression(
    workspaceId: string,
    email: string,
    reason: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO smtp_suppressions (workspace_id, email, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, email) DO UPDATE SET
         reason = EXCLUDED.reason, updated_at = now()`,
      [workspaceId, email, reason],
    );
  }

  async isSuppressed(workspaceId: string, email: string): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM smtp_suppressions WHERE workspace_id = $1 AND email = $2 LIMIT 1`,
      [workspaceId, email],
    );
    return res.rows.length > 0;
  }

  async listSuppressions(workspaceId: string, limit = 500): Promise<SmtpSuppressionRow[]> {
    const res = await this.pool.query<SmtpSuppressionRow>(
      `SELECT * FROM smtp_suppressions WHERE workspace_id = $1 ORDER BY updated_at DESC LIMIT $2`,
      [workspaceId, limit],
    );
    return res.rows;
  }

  async deleteSuppression(workspaceId: string, email: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM smtp_suppressions WHERE workspace_id = $1 AND email = $2`,
      [workspaceId, email],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async deleteCampaign(workspaceId: string, campaignId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM smtp_email_campaigns WHERE workspace_id = $1 AND id = $2 AND status IN ('draft', 'cancelled', 'completed')`,
      [workspaceId, campaignId],
    );
    return (res.rowCount ?? 0) > 0;
  }
}
