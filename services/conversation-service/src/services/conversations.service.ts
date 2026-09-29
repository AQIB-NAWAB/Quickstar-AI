import { AppError, ErrorCode } from "@quickstart/errors";
import type { Conversation, Message } from "../domain/types.js";
import type { AppendMessageResult, ConversationStore } from "../repository/types.js";

export class ConversationsService {
  constructor(private readonly store: ConversationStore) {}

  async createConversation(
    workspaceId: string,
    agentId?: string | null,
    subjectKey?: string | null,
  ): Promise<Conversation> {
    const trimmedSubject = subjectKey?.trim();
    if (trimmedSubject && trimmedSubject.length > 255) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "subject_key must be at most 255 characters",
      });
    }
    return this.store.createConversation({
      workspaceId,
      agentId,
      subjectKey: trimmedSubject ? trimmedSubject : null,
    });
  }

  async getConversation(workspaceId: string, conversationId: string): Promise<Conversation> {
    const conv = await this.store.getConversation(workspaceId, conversationId);
    if (!conv) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Conversation not found",
      });
    }
    return conv;
  }

  async listConversations(workspaceId: string, limit?: number): Promise<Conversation[]> {
    return this.store.listConversations(workspaceId, limit);
  }

  async appendMessage(input: {
    workspaceId: string;
    conversationId: string;
    senderType?: string;
    senderId?: string;
    text?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<AppendMessageResult> {
    const text = input.text?.trim();
    if (!text) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Message text is required and cannot be empty",
      });
    }

    const idempotencyKey = input.idempotencyKey?.trim();
    if (!idempotencyKey) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "idempotency_key is required",
      });
    }

    return this.store.appendMessage({
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      senderType: input.senderType ?? "user",
      senderId: input.senderId ?? "anonymous",
      text,
      idempotencyKey,
      metadata: input.metadata ?? null,
    });
  }

  async listMessages(
    workspaceId: string,
    conversationId: string,
    afterSeq?: number,
    limit?: number,
  ): Promise<Message[]> {
    return this.store.listMessages({
      workspaceId,
      conversationId,
      afterSeq,
      limit,
    });
  }
}
