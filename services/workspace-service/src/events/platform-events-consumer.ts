import { Kafka, type Consumer, logLevel } from "kafkajs";
import {
  PLATFORM_EVENTS_TOPIC,
  isPlatformEventType,
  type PlatformEventEnvelope,
} from "@quickstart/contracts";
import type { Logger } from "@quickstart/logging";
import type { WebhooksRepository } from "../repository/webhooks.repository.js";

export type PlatformEventsConsumerOptions = {
  brokers: string[];
  groupId: string;
  webhooksRepo: WebhooksRepository;
  logger: Logger;
};

export function createPlatformEventsConsumer(options: PlatformEventsConsumerOptions): {
  start: () => Promise<void>;
  stop: () => Promise<void>;
} {
  const { brokers, groupId, webhooksRepo, logger } = options;
  let consumer: Consumer | null = null;
  let kafka: Kafka | null = null;

  return {
    async start() {
      if (brokers.length === 0) {
        logger.info("webhooks.consumer.disabled", {
          detail: "KAFKA_BROKERS unset; webhook platform events consumer idle",
        });
        return;
      }

      try {
        kafka = new Kafka({
          clientId: "quickstart-workspace-webhooks",
          brokers,
          retry: { retries: 2 },
          logLevel: logLevel.ERROR,
        });

        consumer = kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topic: PLATFORM_EVENTS_TOPIC, fromBeginning: false });

        await consumer.run({
          eachMessage: async ({ message }) => {
            if (!message.value) return;

            let envelope: PlatformEventEnvelope;
            try {
              envelope = JSON.parse(message.value.toString()) as PlatformEventEnvelope;
            } catch (err) {
              logger.warn("webhooks.consumer.invalid_json", {
                error: err instanceof Error ? err.message : String(err),
              });
              return;
            }

            if (!isPlatformEventType(envelope.type) || !envelope.event_id || !envelope.workspace_id) {
              logger.warn("webhooks.consumer.invalid_envelope", {
                type: envelope?.type,
                eventId: envelope?.event_id,
                workspaceId: envelope?.workspace_id,
              });
              return;
            }

            try {
              const endpoints = await webhooksRepo.findActiveEndpointsForEvent(
                envelope.workspace_id,
                envelope.type,
              );

              if (endpoints.length === 0) {
                return;
              }

              for (const ep of endpoints) {
                const dedupKey = `${envelope.workspace_id}:${envelope.event_id}:${ep.id}`;
                await webhooksRepo.enqueueDelivery({
                  webhookId: ep.id,
                  workspaceId: envelope.workspace_id,
                  eventType: envelope.type,
                  payload: envelope as unknown as Record<string, unknown>,
                  canonicalEventId: dedupKey,
                });
              }

              logger.info("webhooks.consumer.deliveries_enqueued", {
                eventType: envelope.type,
                eventId: envelope.event_id,
                endpointCount: endpoints.length,
              });
            } catch (err) {
              logger.error("webhooks.consumer.enqueue_error", {
                error: err instanceof Error ? err.message : String(err),
                eventId: envelope.event_id,
              });
            }
          },
        });

        logger.info("webhooks.consumer.started", { topic: PLATFORM_EVENTS_TOPIC, groupId });
      } catch (err) {
        logger.warn("webhooks.consumer.unavailable", {
          detail: "Kafka broker unreachable; webhook platform events consumer idle",
          error: err instanceof Error ? err.message : String(err),
        });
        if (consumer) {
          await consumer.disconnect().catch(() => undefined);
          consumer = null;
        }
      }
    },

    async stop() {
      if (consumer) {
        await consumer.disconnect().catch(() => undefined);
        consumer = null;
      }
    },
  };
}
