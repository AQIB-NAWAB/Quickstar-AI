import { Kafka, type Consumer, logLevel } from "kafkajs";
import {
  PLATFORM_EVENTS_TOPIC,
  isPlatformEventType,
  type PlatformEventEnvelope,
} from "@quickstart/contracts";
import type { Logger } from "@quickstart/logging";
import type { WorkflowRunner } from "../engine/runner.js";
import type { WorkflowsRepository } from "../repository/workflows.repository.js";

export type WorkflowKafkaOptions = {
  brokers: string[];
  groupId: string;
  runner: WorkflowRunner;
  repo: WorkflowsRepository;
  logger: Logger;
};

export async function ensurePlatformTopic(brokers: string[], logger: Logger): Promise<void> {
  if (brokers.length === 0) return;
  const kafka = new Kafka({
    clientId: "quickstart-workflow-admin",
    brokers,
    logLevel: logLevel.ERROR,
  });
  const admin = kafka.admin();
  try {
    await admin.connect();
    const topics = await admin.listTopics();
    if (!topics.includes(PLATFORM_EVENTS_TOPIC)) {
      await admin.createTopics({
        topics: [{ topic: PLATFORM_EVENTS_TOPIC, numPartitions: 3, replicationFactor: 1 }],
        waitForLeaders: true,
      });
      logger.info("kafka.topic_created", { topic: PLATFORM_EVENTS_TOPIC });
    }
  } finally {
    await admin.disconnect().catch(() => undefined);
  }
}

export function createWorkflowEventConsumer(options: WorkflowKafkaOptions): {
  start: () => Promise<void>;
  stop: () => Promise<void>;
} {
  const { brokers, groupId, runner, repo, logger } = options;
  let consumer: Consumer | null = null;
  let kafka: Kafka | null = null;

  return {
    async start() {
      if (brokers.length === 0) {
        logger.info("kafka.disabled", { detail: "KAFKA_BROKERS unset; workflow consumer idle" });
        return;
      }
      await ensurePlatformTopic(brokers, logger);
      kafka = new Kafka({
        clientId: "quickstart-workflow",
        brokers,
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
          } catch {
            logger.warn("workflow.consumer.invalid_json");
            await repo.insertDeadLetter({
              workspaceId: null,
              eventId: null,
              eventType: null,
              payload: { raw: message.value.toString().slice(0, 2_048) },
              errorMessage: "Invalid JSON envelope",
            });
            return;
          }

          if (!isPlatformEventType(envelope.type) || !envelope.event_id || !envelope.workspace_id) {
            await repo.insertDeadLetter({
              workspaceId: envelope.workspace_id ?? null,
              eventId: envelope.event_id ?? null,
              eventType: envelope.type ?? null,
              payload: envelope as unknown as Record<string, unknown>,
              errorMessage: "Invalid platform event envelope",
            });
            return;
          }

          await runner.handleEvent(envelope);
        },
      });
      logger.info("workflow.consumer_started", { topic: PLATFORM_EVENTS_TOPIC, groupId });
    },
    async stop() {
      if (consumer) {
        await consumer.disconnect();
        consumer = null;
      }
    },
  };
}
