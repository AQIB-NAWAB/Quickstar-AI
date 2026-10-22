import type { Pool } from "pg";
import type {
  ConversationHandoffRecord,
  CreateQueueRequest,
  EnqueueConversationRequest,
  HandoffStatus,
  OperatorQueue,
  QueuePriority,
  UpdateQueueRequest,
} from "@quickstart/contracts";

export interface QueueRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  routing_strategy: string;
  max_wait_time_seconds: number;
  pause_ai_on_handoff: boolean;
  is_default: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  open_count?: string | number;
}

export interface QueueItemRow {
  id: string;
  workspace_id: string;
  queue_id: string;
  conversation_id: string;
  priority: string;
  status: string;
  assigned_operator_id: string | null;
  handoff_reason: string | null;
  workflow_run_id: string | null;
  internal_note: string | null;
  visitor_message: string | null;
  metadata: Record<string, unknown>;
  queued_at: Date;
  assigned_at: Date | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapQueueRow(r: QueueRow): OperatorQueue {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    name: r.name,
    description: r.description,
    routingStrategy: (r.routing_strategy as OperatorQueue["routingStrategy"]) || "manual_claim",
    maxWaitTimeSeconds: r.max_wait_time_seconds ?? 300,
    pauseAiOnHandoff: r.pause_ai_on_handoff ?? true,
    openConversationsCount: Number(r.open_count ?? 0),
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

function mapItemRow(r: QueueItemRow): ConversationHandoffRecord {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    conversationId: r.conversation_id,
    queueId: r.queue_id,
    status: r.status as HandoffStatus,
    priority: r.priority as QueuePriority,
    assignedOperatorId: r.assigned_operator_id,
    handoffReason: r.handoff_reason,
    workflowRunId: r.workflow_run_id,
    internalNote: r.internal_note,
    visitorMessage: r.visitor_message,
    queuedAt: r.queued_at.toISOString(),
    assignedAt: r.assigned_at ? r.assigned_at.toISOString() : null,
    resolvedAt: r.resolved_at ? r.resolved_at.toISOString() : null,
  };
}

export class OperatorQueuesRepository {
  constructor(private readonly pool: Pool) {}

  async listQueues(workspaceId: string): Promise<OperatorQueue[]> {
    const sql = `
      SELECT q.*,
        COUNT(i.id) FILTER (WHERE i.status IN ('queued', 'assigned', 'in_progress')) AS open_count
      FROM conversation_operator_queues q
      LEFT JOIN conversation_operator_queue_items i ON i.queue_id = q.id
      WHERE q.workspace_id = $1 AND q.is_active = true
      GROUP BY q.id
      ORDER BY q.created_at ASC
    `;
    const res = await this.pool.query<QueueRow>(sql, [workspaceId]);
    return res.rows.map(mapQueueRow);
  }

  async getQueue(workspaceId: string, queueId: string): Promise<OperatorQueue | null> {
    const sql = `
      SELECT q.*,
        COUNT(i.id) FILTER (WHERE i.status IN ('queued', 'assigned', 'in_progress')) AS open_count
      FROM conversation_operator_queues q
      LEFT JOIN conversation_operator_queue_items i ON i.queue_id = q.id
      WHERE q.workspace_id = $1 AND q.id = $2
      GROUP BY q.id
    `;
    const res = await this.pool.query<QueueRow>(sql, [workspaceId, queueId]);
    if (res.rows.length === 0) return null;
    return mapQueueRow(res.rows[0]);
  }

  async createQueue(workspaceId: string, data: CreateQueueRequest): Promise<OperatorQueue> {
    const sql = `
      INSERT INTO conversation_operator_queues (
        workspace_id, name, description, routing_strategy, max_wait_time_seconds, pause_ai_on_handoff
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await this.pool.query<QueueRow>(sql, [
      workspaceId,
      data.name,
      data.description ?? null,
      data.routingStrategy ?? "manual_claim",
      data.maxWaitTimeSeconds ?? 300,
      data.pauseAiOnHandoff ?? true,
    ]);
    return mapQueueRow(res.rows[0]);
  }

  async updateQueue(
    workspaceId: string,
    queueId: string,
    data: UpdateQueueRequest,
  ): Promise<OperatorQueue | null> {
    const sets: string[] = ["updated_at = NOW()"];
    const vals: unknown[] = [workspaceId, queueId];

    if (data.name !== undefined) {
      vals.push(data.name);
      sets.push(`name = $${vals.length}`);
    }
    if (data.description !== undefined) {
      vals.push(data.description);
      sets.push(`description = $${vals.length}`);
    }
    if (data.routingStrategy !== undefined) {
      vals.push(data.routingStrategy);
      sets.push(`routing_strategy = $${vals.length}`);
    }
    if (data.maxWaitTimeSeconds !== undefined) {
      vals.push(data.maxWaitTimeSeconds);
      sets.push(`max_wait_time_seconds = $${vals.length}`);
    }
    if (data.pauseAiOnHandoff !== undefined) {
      vals.push(data.pauseAiOnHandoff);
      sets.push(`pause_ai_on_handoff = $${vals.length}`);
    }

    const sql = `
      UPDATE conversation_operator_queues
      SET ${sets.join(", ")}
      WHERE workspace_id = $1 AND id = $2 AND is_active = true
      RETURNING *
    `;
    const res = await this.pool.query<QueueRow>(sql, vals);
    if (res.rows.length === 0) return null;
    return mapQueueRow(res.rows[0]);
  }

  async deleteQueue(workspaceId: string, queueId: string): Promise<boolean> {
    const sql = `
      UPDATE conversation_operator_queues
      SET is_active = false, updated_at = NOW()
      WHERE workspace_id = $1 AND id = $2
    `;
    const res = await this.pool.query(sql, [workspaceId, queueId]);
    return (res.rowCount ?? 0) > 0;
  }

  async enqueueConversation(
    input: EnqueueConversationRequest & { workspaceId: string },
  ): Promise<ConversationHandoffRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Resolve queue to see pause_ai_on_handoff setting
      const qRes = await client.query<{ pause_ai_on_handoff: boolean }>(
        "SELECT pause_ai_on_handoff FROM conversation_operator_queues WHERE workspace_id = $1 AND id = $2",
        [input.workspaceId, input.queueId],
      );
      const pauseAi = qRes.rows.length > 0 ? qRes.rows[0].pause_ai_on_handoff : true;

      // Update conversation state: mark waiting, pause bot if configured, set active_queue_id
      await client.query(
        `UPDATE conversations
         SET state = 'waiting',
             bot_paused = $3,
             active_queue_id = $4,
             updated_at = NOW()
         WHERE workspace_id = $1 AND id = $2`,
        [input.workspaceId, input.conversationId, pauseAi, input.queueId],
      );

      // Create queue item record
      const itemSql = `
        INSERT INTO conversation_operator_queue_items (
          workspace_id, queue_id, conversation_id, priority, status,
          handoff_reason, workflow_run_id, internal_note, visitor_message
        ) VALUES ($1, $2, $3, $4, 'queued', $5, $6, $7, $8)
        RETURNING *
      `;
      const itemRes = await client.query<QueueItemRow>(itemSql, [
        input.workspaceId,
        input.queueId,
        input.conversationId,
        input.priority ?? "normal",
        input.reason ?? null,
        input.workflowRunId ?? null,
        input.internalNote ?? null,
        input.visitorMessage ?? null,
      ]);

      await client.query("COMMIT");
      return mapItemRow(itemRes.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async claimConversation(
    workspaceId: string,
    queueItemId: string,
    operatorId: string,
  ): Promise<ConversationHandoffRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const itemRes = await client.query<QueueItemRow>(
        `UPDATE conversation_operator_queue_items
         SET status = 'assigned',
             assigned_operator_id = $3,
             assigned_at = NOW(),
             updated_at = NOW()
         WHERE workspace_id = $1 AND id = $2
         RETURNING *`,
        [workspaceId, queueItemId, operatorId],
      );

      if (itemRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const item = itemRes.rows[0];

      // Update conversation table
      await client.query(
        `UPDATE conversations
         SET state = 'human',
             assignee_user_id = $3,
             updated_at = NOW()
         WHERE workspace_id = $1 AND id = $2`,
        [workspaceId, item.conversation_id, operatorId],
      );

      await client.query("COMMIT");
      return mapItemRow(item);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async resolveConversation(
    workspaceId: string,
    queueItemId: string,
    returnToBot: boolean,
  ): Promise<ConversationHandoffRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const newStatus = returnToBot ? "returned_to_bot" : "resolved";
      const itemRes = await client.query<QueueItemRow>(
        `UPDATE conversation_operator_queue_items
         SET status = $3,
             resolved_at = NOW(),
             updated_at = NOW()
         WHERE workspace_id = $1 AND id = $2
         RETURNING *`,
        [workspaceId, queueItemId, newStatus],
      );

      if (itemRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const item = itemRes.rows[0];

      // Update conversation table: if return to bot, unpause bot and set state back to bot
      await client.query(
        `UPDATE conversations
         SET state = $3,
             bot_paused = $4,
             active_queue_id = NULL,
             assignee_user_id = $5,
             updated_at = NOW()
         WHERE workspace_id = $1 AND id = $2`,
        [
          workspaceId,
          item.conversation_id,
          returnToBot ? "bot" : "human",
          returnToBot ? false : true,
          returnToBot ? null : item.assigned_operator_id,
        ],
      );

      await client.query("COMMIT");
      return mapItemRow(item);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async listQueueItems(
    workspaceId: string,
    queueId?: string,
    status?: string,
  ): Promise<ConversationHandoffRecord[]> {
    const conds: string[] = ["workspace_id = $1"];
    const vals: unknown[] = [workspaceId];

    if (queueId) {
      vals.push(queueId);
      conds.push(`queue_id = $${vals.length}`);
    }
    if (status) {
      vals.push(status);
      conds.push(`status = $${vals.length}`);
    }

    const sql = `
      SELECT *
      FROM conversation_operator_queue_items
      WHERE ${conds.join(" AND ")}
      ORDER BY queued_at ASC
      LIMIT 100
    `;
    const res = await this.pool.query<QueueItemRow>(sql, vals);
    return res.rows.map(mapItemRow);
  }
}
