import {
  CreateQueueCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import type { KnowledgeConfig } from "../config/environment.js";

export type IngestJobMessage =
  | { action: "ingest"; source_id: string; workspace_id: string; version: number }
  | { action: "delete"; source_id: string; workspace_id: string; version?: number };

export class IngestQueue {
  private readonly client: SQSClient;
  private queueUrl = "";

  constructor(private readonly config: KnowledgeConfig) {
    this.client = new SQSClient({
      region: config.sqsRegion,
      endpoint: config.sqsEndpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local",
      },
    });
  }

  async ensureQueue(): Promise<void> {
    const out = await this.client.send(
      new CreateQueueCommand({ QueueName: this.config.sqsQueueName }),
    );
    this.queueUrl = out.QueueUrl ?? "";
    if (!this.queueUrl) {
      throw new Error("Failed to resolve SQS queue URL");
    }
  }

  async send(job: IngestJobMessage): Promise<void> {
    if (!this.queueUrl) {
      await this.ensureQueue();
    }
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(job),
      }),
    );
  }

  async receive(): Promise<{ job: IngestJobMessage; receiptHandle: string } | null> {
    if (!this.queueUrl) {
      await this.ensureQueue();
    }
    const out = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
        VisibilityTimeout: 60,
      }),
    );
    const msg = out.Messages?.[0];
    if (!msg?.Body || !msg.ReceiptHandle) {
      return null;
    }
    return {
      job: JSON.parse(msg.Body) as IngestJobMessage,
      receiptHandle: msg.ReceiptHandle,
    };
  }

  async ack(receiptHandle: string): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  }
}
