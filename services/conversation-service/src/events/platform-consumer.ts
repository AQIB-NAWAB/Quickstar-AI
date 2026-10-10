import type { Pool } from "pg";
import { PLATFORM_EVENTS_TOPIC, type PlatformEventEnvelope } from "@quickstart/contracts";
import type { Logger } from "@quickstart/logging";
import type { Kafka, Consumer } from "kafkajs";
import { applyHandoffEvent } from "./handoff-metrics.js";

export type PlatformConsumerOptions = {
  pool: Pool;
  kafka: Kafka;
  logger: Logger;
  groupId?: string;
};

export function createPlatformEventConsumer(options: PlatformConsumerOptions): {
  start: () => Promise<void>;
  stop: () => Promise<void>;
} {
  const { pool, kafka, logger, groupId = "quickstart-platform-v1" } = options;
  let consumer: Consumer | null = null;

  return {
    async start() {
      consumer = kafka.consumer({ groupId });
      await consumer.connect();
      await consumer.subscribe({ topic: PLATFORM_EVENTS_TOPIC, fromBeginning: false });
      await consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) {
            return;
          }
          let envelope: PlatformEventEnvelope;
          try {
            envelope = JSON.parse(message.value.toString()) as PlatformEventEnvelope;
          } catch {
            logger.warn("events.consumer.invalid_json");
            return;
          }
          if (envelope.type === "conversation.handed_off") {
            await applyHandoffEvent(pool, envelope);
          }
        },
      });
      logger.info("events.consumer_started", { topic: PLATFORM_EVENTS_TOPIC, groupId });
    },
    async stop() {
      if (consumer) {
        await consumer.disconnect();
        consumer = null;
      }
    },
  };
}
