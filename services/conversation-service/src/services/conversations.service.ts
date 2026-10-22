import { randomUUID } from "node:crypto";
import type { UpsertToolCallBody, WorkspaceRole } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { ToolCall } from "../domain/tool-call.js";
import type { Conversation, Message } from "../domain/types.js";
import type { AppendMessageResult, ConversationStore, ListConversationsOptions } from "../repository/types.js";

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

  async listConversations(
    workspaceId: string,
    options?: ListConversationsOptions,
  ): Promise<Conversation[]> {
    return this.store.listConversations(workspaceId, options);
  }

  async takeHandoff(
    workspaceId: string,
    conversationId: string,
    assigneeUserId: string,
    requestId?: string | null,
  ): Promise<Conversation> {
    if (!assigneeUserId?.trim()) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "assignee user id is required",
      });
    }
    const conversation = await this.store.takeHandoff(
      workspaceId,
      conversationId,
      assigneeUserId,
      requestId,
    );
    await this.store.appendMessage({
      workspaceId,
      conversationId,
      senderType: "system",
      senderId: assigneeUserId,
      text: "A teammate joined the chat.",
      idempotencyKey: `handoff-join:${conversationId}:${randomUUID()}`,
      metadata: { kind: "handoff_joined" },
    });
    return conversation;
  }

  async requestVoiceAttention(workspaceId: string, conversationId: string, channel: "chat" | "voice" = "voice"): Promise<Conversation> {
    const existing = await this.getConversation(workspaceId, conversationId);
    if (existing.state !== "bot") return existing;
    const updated = await this.store.markVoiceWaiting(workspaceId, conversationId);
    await this.store.appendMessage({
      workspaceId,
      conversationId,
      senderType: "system",
      senderId: "voice",
      text: channel === "voice" ? "A visitor is waiting for a teammate on a live call." : "A visitor is waiting for a teammate in chat.",
      idempotencyKey: `voice-attention:${conversationId}`,
      metadata: { kind: channel === "voice" ? "voice_attention" : "agent_attention" },
    });
    return updated ?? existing;
  }

  async releaseHandoff(
    workspaceId: string,
    conversationId: string,
    actorUserId: string,
    actorRole: WorkspaceRole,
  ): Promise<Conversation> {
    if (!actorUserId?.trim()) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "actor user id is required",
      });
    }
    const conversation = await this.store.releaseHandoff(
      workspaceId,
      conversationId,
      actorUserId,
      actorRole,
    );
    await this.store.appendMessage({
      workspaceId,
      conversationId,
      senderType: "system",
      senderId: actorUserId,
      text: "The teammate left. The assistant will reply again.",
      idempotencyKey: `handoff-leave:${conversationId}:${randomUUID()}`,
      metadata: { kind: "handoff_released" },
    });
    return conversation;
  }

  async appendMessage(input: {
    workspaceId: string;
    conversationId: string;
    senderType?: string;
    senderId?: string;
    actorRole?: WorkspaceRole;
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

    const senderType = input.senderType ?? "user";
    if (senderType === "human") {
      const conv = await this.getConversation(input.workspaceId, input.conversationId);
      if (conv.state !== "human") {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Human messages require an active handoff",
        });
      }
      const senderId = input.senderId ?? "anonymous";
      const role = input.actorRole;
      const isAdmin = role === "owner" || role === "admin";
      if (conv.assigneeUserId !== senderId && !isAdmin) {
        throw new AppError({
          code: ErrorCode.FORBIDDEN,
          message: "Only the assignee or an admin can send human messages",
        });
      }
    }

    return this.store.appendMessage({
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      senderType,
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

  async upsertToolCall(
    workspaceId: string,
    conversationId: string,
    body: UpsertToolCallBody,
  ): Promise<{ record: ToolCall; created: boolean }> {
    if (!body.tool_call_key?.trim() || !body.turn_idempotency_key?.trim() || !body.tool_name?.trim()) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "tool_call_key, turn_idempotency_key, and tool_name are required",
      });
    }
    return this.store.upsertToolCall({ workspaceId, conversationId, body });
  }

  async listToolCalls(
    workspaceId: string,
    conversationId: string,
    turnIdempotencyKey: string,
  ): Promise<ToolCall[]> {
    const key = turnIdempotencyKey?.trim();
    if (!key) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "turn_idempotency_key is required",
      });
    }
    return this.store.listToolCalls(workspaceId, conversationId, key);
  }

  async updateTags(
    workspaceId: string,
    conversationId: string,
    tags: string[],
    mode: "add" | "remove" | "replace" = "add",
  ): Promise<string[]> {
    if (!workspaceId?.trim() || !conversationId?.trim()) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "workspaceId and conversationId are required",
      });
    }
    return this.store.updateTags(workspaceId, conversationId, tags, mode);
  }
}
