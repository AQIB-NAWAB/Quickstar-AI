import type { Pool } from "pg";
import { PLATFORM_EVENTS_TOPIC, type PlatformEventEnvelope } from "@quickstart/contracts";
import type { Logger } from "@quickstart/logging";
import type { Kafka, Producer } from "kafkajs";

const BATCH_SIZE = 50;
const POLL_MS = 2_000;

export type OutboxPublisherOptions = {
  pool: Pool;
  kafka: Kafka;
  logger: Logger;
};

export function createOutboxPublisher(options: OutboxPublisherOptions): {
  start: () => Promise<void>;
  stop: () => Promise<void>;
} {
  const { pool, kafka, logger } = options;
  let producer: Producer | null = null;
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  async function publishBatch(): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{
        id: string;
        workspace_id: string;
        type: string;
        payload: Record<string, unknown>;
        request_id: string | null;
        created_at: Date;
      }>(
        `SELECT id, workspace_id, type, payload, request_id, created_at
         FROM outbox_events
         WHERE published_at IS NULL
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [BATCH_SIZE],
      );

      if (rows.length === 0) {
        await client.query("COMMIT");
        return;
      }

      if (!producer) {
        throw new Error("Kafka producer not connected");
      }

      for (const row of rows) {
        const envelope: PlatformEventEnvelope = {
          event_id: row.id,
          type: row.type as PlatformEventEnvelope["type"],
          workspace_id: row.workspace_id,
          occurred_at: row.created_at.toISOString(),
          request_id: row.request_id,
          data: row.payload,
        };
        await producer.send({
          topic: PLATFORM_EVENTS_TOPIC,
          messages: [{ key: row.workspace_id, value: JSON.stringify(envelope) }],
        });
        await client.query(`UPDATE outbox_events SET published_at = NOW() WHERE id = $1`, [row.id]);
      }

      await client.query("COMMIT");
      logger.info("outbox.published", { count: rows.length });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.warn("outbox.publish_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      client.release();
    }
  }

  return {
    async start() {
      if (running) {
        return;
      }
      running = true;
      producer = kafka.producer();
      await producer.connect();
      timer = setInterval(() => {
        void publishBatch();
      }, POLL_MS);
      logger.info("outbox.publisher_started", { topic: PLATFORM_EVENTS_TOPIC });
    },
    async stop() {
      running = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (producer) {
        await producer.disconnect();
        producer = null;
      }
    },
  };
}
