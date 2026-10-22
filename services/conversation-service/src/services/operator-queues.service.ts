import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  ConversationHandoffRecord,
  CreateQueueRequest,
  EnqueueConversationRequest,
  OperatorQueue,
  UpdateQueueRequest,
} from "@quickstart/contracts";
import type { OperatorQueuesRepository } from "../repository/operator-queues.repository.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class OperatorQueuesService {
  constructor(private readonly repo: OperatorQueuesRepository) {}

  async listQueues(workspaceId: string): Promise<OperatorQueue[]> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    return this.repo.listQueues(workspaceId);
  }

  async getQueue(workspaceId: string, queueId: string): Promise<OperatorQueue> {
    if (!UUID_REGEX.test(workspaceId) || !UUID_REGEX.test(queueId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid UUIDs required" });
    }
    const q = await this.repo.getQueue(workspaceId, queueId);
    if (!q) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: `Operator queue ${queueId} not found` });
    }
    return q;
  }

  async createQueue(workspaceId: string, data: CreateQueueRequest): Promise<OperatorQueue> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    if (!data.name?.trim()) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Queue name is required" });
    }
    return this.repo.createQueue(workspaceId, data);
  }

  async updateQueue(
    workspaceId: string,
    queueId: string,
    data: UpdateQueueRequest,
  ): Promise<OperatorQueue> {
    if (!UUID_REGEX.test(workspaceId) || !UUID_REGEX.test(queueId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid UUIDs required" });
    }
    const q = await this.repo.updateQueue(workspaceId, queueId, data);
    if (!q) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: `Operator queue ${queueId} not found` });
    }
    return q;
  }

  async deleteQueue(workspaceId: string, queueId: string): Promise<void> {
    if (!UUID_REGEX.test(workspaceId) || !UUID_REGEX.test(queueId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid UUIDs required" });
    }
    const deleted = await this.repo.deleteQueue(workspaceId, queueId);
    if (!deleted) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: `Operator queue ${queueId} not found` });
    }
  }

  async enqueueConversation(
    workspaceId: string,
    input: EnqueueConversationRequest,
  ): Promise<ConversationHandoffRecord> {
    if (!UUID_REGEX.test(workspaceId) || !UUID_REGEX.test(input.conversationId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid UUIDs required" });
    }

    // Default queue fallback if queueId not provided or invalid
    let targetQueueId = input.queueId;
    if (!targetQueueId || !UUID_REGEX.test(targetQueueId)) {
      const queues = await this.repo.listQueues(workspaceId);
      if (queues.length === 0) {
        // Create a default queue on the fly
        const def = await this.repo.createQueue(workspaceId, {
          name: "Default Inbound Queue",
          description: "Auto-created default operator routing queue",
          routingStrategy: "manual_claim",
        });
        targetQueueId = def.id;
      } else {
        targetQueueId = queues[0].id;
      }
    }

    return this.repo.enqueueConversation({
      ...input,
      workspaceId,
      queueId: targetQueueId,
    });
  }

  async claimConversation(
    workspaceId: string,
    queueItemId: string,
    operatorId: string,
  ): Promise<ConversationHandoffRecord> {
    if (!UUID_REGEX.test(workspaceId) || !UUID_REGEX.test(queueItemId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid UUIDs required" });
    }
    const item = await this.repo.claimConversation(workspaceId, queueItemId, operatorId);
    if (!item) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: `Queue item ${queueItemId} not found or could not be claimed`,
      });
    }
    return item;
  }

  async resolveConversation(
    workspaceId: string,
    queueItemId: string,
    returnToBot: boolean,
  ): Promise<ConversationHandoffRecord> {
    if (!UUID_REGEX.test(workspaceId) || !UUID_REGEX.test(queueItemId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid UUIDs required" });
    }
    const item = await this.repo.resolveConversation(workspaceId, queueItemId, returnToBot);
    if (!item) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: `Queue item ${queueItemId} not found or already resolved`,
      });
    }
    return item;
  }

  async listQueueItems(
    workspaceId: string,
    queueId?: string,
    status?: string,
  ): Promise<ConversationHandoffRecord[]> {
    if (!UUID_REGEX.test(workspaceId)) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Valid workspace UUID required" });
    }
    return this.repo.listQueueItems(workspaceId, queueId, status);
  }
}
