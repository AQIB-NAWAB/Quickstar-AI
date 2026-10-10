import type { Pool } from "pg";
import type { PlatformEventEnvelope } from "@quickstart/contracts";
import { isPlatformEventType } from "@quickstart/contracts";

/** Idempotent apply for conversation.handed_off — safe under at-least-once delivery. */
export async function applyHandoffEvent(pool: Pool, envelope: PlatformEventEnvelope): Promise<boolean> {
  if (!isPlatformEventType(envelope.type) || envelope.type !== "conversation.handed_off") {
    return false;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const receipt = await client.query<{ event_id: string }>(
      `INSERT INTO event_consumer_receipts (event_id) VALUES ($1)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [envelope.event_id],
    );
    if (receipt.rowCount === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    await client.query(
      `INSERT INTO workspace_handoff_metrics (workspace_id, handoff_count, updated_at)
       VALUES ($1, 1, NOW())
       ON CONFLICT (workspace_id) DO UPDATE
       SET handoff_count = workspace_handoff_metrics.handoff_count + 1,
           updated_at = NOW()`,
      [envelope.workspace_id],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
