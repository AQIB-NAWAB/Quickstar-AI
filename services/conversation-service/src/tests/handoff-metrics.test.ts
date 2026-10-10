import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { randomUUID } from "node:crypto";
import type { PlatformEventEnvelope } from "@quickstart/contracts";
import { applyHandoffEvent } from "../events/handoff-metrics.js";
import { runConversationMigrations } from "../repository/migrate.js";

const runIntegration = process.env.CONVERSATION_INTEGRATION_TEST === "1";

test(
  "applyHandoffEvent increments once and dedupes duplicate event_id",
  { skip: !runIntegration },
  async () => {
    const databaseUrl =
      process.env.DATABASE_URL ?? "postgresql://quickstart:quickstart@127.0.0.1:5433/quickstart";
    const pool = new pg.Pool({ connectionString: databaseUrl });
    await runConversationMigrations(pool);

    const workspaceId = "00000000-0000-4000-8000-0000000000f1";
    const eventId = randomUUID();
    const envelope: PlatformEventEnvelope = {
      event_id: eventId,
      type: "conversation.handed_off",
      workspace_id: workspaceId,
      occurred_at: new Date().toISOString(),
      request_id: "req-test",
      data: {
        conversation_id: randomUUID(),
        assignee_user_id: randomUUID(),
      },
    };

    const first = await applyHandoffEvent(pool, envelope);
    const second = await applyHandoffEvent(pool, envelope);
    assert.equal(first, true);
    assert.equal(second, false);

    const { rows } = await pool.query<{ handoff_count: string }>(
      `SELECT handoff_count FROM workspace_handoff_metrics WHERE workspace_id = $1`,
      [workspaceId],
    );
    assert.equal(rows.length, 1);
    assert.equal(Number(rows[0].handoff_count), 1);

    await pool.end();
  },
);
