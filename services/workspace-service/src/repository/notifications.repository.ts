import type { Pool } from "pg";

export type NotificationRow = {
  id: string;
  workspace_id: string;
  recipient_user_id: string | null;
  category: string;
  severity: string;
  type: string;
  title: string;
  description: string;
  source_type: string | null;
  source_id: string | null;
  source_name: string | null;
  action_url: string | null;
  action_label: string | null;
  read_at: Date | null;
  dismissed_at: Date | null;
  deduplication_key: string | null;
  created_at: Date;
};

export type ListNotificationsOpts = {
  category?: string;
  unreadOnly?: boolean;
  limit?: number;
};

export class NotificationsRepository {
  constructor(private readonly pool: Pool) {}

  async listByWorkspace(
    workspaceId: string,
    opts: ListNotificationsOpts = {},
  ): Promise<{ rows: NotificationRow[]; total: number; unreadCount: number }> {
    const params: unknown[] = [workspaceId];
    let filterClause = "WHERE workspace_id = $1 AND dismissed_at IS NULL";

    if (opts.unreadOnly || opts.category === "unread") {
      filterClause += " AND read_at IS NULL";
    } else if (opts.category && opts.category !== "all") {
      params.push(opts.category);
      filterClause += ` AND category = $${params.length}`;
    }

    const unreadRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM workspace_notifications
       WHERE workspace_id = $1 AND read_at IS NULL AND dismissed_at IS NULL`,
      [workspaceId],
    );
    const unreadCount = Number.parseInt(unreadRes.rows[0]?.count ?? "0", 10);

    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM workspace_notifications
       ${filterClause}`,
      params,
    );
    const total = Number.parseInt(countRes.rows[0]?.count ?? "0", 10);

    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    params.push(limit);
    const limitIndex = params.length;

    const query = `
      SELECT *
      FROM workspace_notifications
      ${filterClause}
      ORDER BY created_at DESC
      LIMIT $${limitIndex}
    `;

    const res = await this.pool.query<NotificationRow>(query, params);
    return { rows: res.rows, total, unreadCount };
  }

  async getUnreadCount(workspaceId: string): Promise<number> {
    const res = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM workspace_notifications
       WHERE workspace_id = $1 AND read_at IS NULL AND dismissed_at IS NULL`,
      [workspaceId],
    );
    return Number.parseInt(res.rows[0]?.count ?? "0", 10);
  }

  async markAsRead(
    workspaceId: string,
    notificationId: string,
  ): Promise<NotificationRow | null> {
    const updateRes = await this.pool.query<NotificationRow>(
      `UPDATE workspace_notifications
       SET read_at = COALESCE(read_at, now())
       WHERE workspace_id = $1 AND id = $2
       RETURNING *`,
      [workspaceId, notificationId],
    );
    return updateRes.rows[0] ?? null;
  }

  async markAllAsRead(workspaceId: string, category?: string): Promise<number> {
    const params: unknown[] = [workspaceId];
    let catClause = "";
    if (category && category !== "all" && category !== "unread") {
      params.push(category);
      catClause = ` AND category = $2`;
    }

    const res = await this.pool.query(
      `UPDATE workspace_notifications
       SET read_at = now()
       WHERE workspace_id = $1 AND read_at IS NULL AND dismissed_at IS NULL${catClause}`,
      params,
    );
    return res.rowCount ?? 0;
  }

  async dismissRead(workspaceId: string): Promise<number> {
    const res = await this.pool.query(
      `UPDATE workspace_notifications
       SET dismissed_at = now()
       WHERE workspace_id = $1 AND read_at IS NOT NULL AND dismissed_at IS NULL`,
      [workspaceId],
    );
    return res.rowCount ?? 0;
  }

  async createNotification(params: {
    workspaceId: string;
    recipientUserId?: string | null;
    category: string;
    severity?: string;
    type: string;
    title: string;
    description: string;
    sourceType?: string | null;
    sourceId?: string | null;
    sourceName?: string | null;
    actionUrl?: string | null;
    actionLabel?: string | null;
    deduplicationKey?: string | null;
  }): Promise<NotificationRow> {
    if (params.deduplicationKey) {
      // Check if recent notification with same deduplication key exists within 1 hour
      const existing = await this.pool.query<NotificationRow>(
        `SELECT * FROM workspace_notifications
         WHERE workspace_id = $1
           AND deduplication_key = $2
           AND created_at >= now() - interval '1 hour'
         LIMIT 1`,
        [params.workspaceId, params.deduplicationKey],
      );
      if (existing.rows[0]) {
        return existing.rows[0];
      }
    }

    const res = await this.pool.query<NotificationRow>(
      `INSERT INTO workspace_notifications (
        workspace_id,
        recipient_user_id,
        category,
        severity,
        type,
        title,
        description,
        source_type,
        source_id,
        source_name,
        action_url,
        action_label,
        deduplication_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        params.workspaceId,
        params.recipientUserId ?? null,
        params.category,
        params.severity ?? "info",
        params.type,
        params.title,
        params.description,
        params.sourceType ?? null,
        params.sourceId ?? null,
        params.sourceName ?? null,
        params.actionUrl ?? null,
        params.actionLabel ?? null,
        params.deduplicationKey ?? null,
      ],
    );

    return res.rows[0];
  }
}
