import { randomUUID } from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Conversation, Message } from "../domain/types.js";
import type {
  AppendMessageInput,
  AppendMessageResult,
  ConversationStore,
  CreateConversationInput,
  ListMessagesInput,
} from "./types.js";

export class MemoryConversationStore implements ConversationStore {
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, Message>();
  private idempotency = new Map<string, string>(); // `${conversationId}:${idempotencyKey}` -> messageId

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = {
      id,
      workspaceId: input.workspaceId,
      agentId: input.agentId ?? null,
      subjectKey: input.subjectKey ?? null,
      lastSeq: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversation(workspaceId: string, conversationId: string): Promise<Conversation | null> {
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.workspaceId !== workspaceId) {
      return null;
    }
    return conv;
  }

  async listConversations(workspaceId: string, limit = 50): Promise<Conversation[]> {
    const list: Conversation[] = [];
    for (const conv of this.conversations.values()) {
      if (conv.workspaceId === workspaceId) {
        list.push(conv);
      }
    }
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list.slice(0, limit);
  }

  async appendMessage(input: AppendMessageInput): Promise<AppendMessageResult> {
    const idemKey = `${input.conversationId}:${input.idempotencyKey}`;
    const existingMsgId = this.idempotency.get(idemKey);
    if (existingMsgId) {
      const existing = this.messages.get(existingMsgId);
      if (existing) {
        if (existing.workspaceId !== input.workspaceId) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Conversation not found",
          });
        }
        return { message: existing, deduplicated: true };
      }
    }

    const conv = this.conversations.get(input.conversationId);
    if (!conv || conv.workspaceId !== input.workspaceId) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Conversation not found",
      });
    }

    conv.lastSeq += 1;
    conv.updatedAt = new Date();

    const id = randomUUID();
    const message: Message = {
      id,
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      seq: conv.lastSeq,
      senderType: input.senderType,
      senderId: input.senderId,
      text: input.text,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata ?? null,
      createdAt: new Date(),
    };

    this.messages.set(id, message);
    this.idempotency.set(idemKey, id);

    return { message, deduplicated: false };
  }

  async listMessages(input: ListMessagesInput): Promise<Message[]> {
    const conv = this.conversations.get(input.conversationId);
    if (!conv || conv.workspaceId !== input.workspaceId) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Conversation not found",
      });
    }

    const list: Message[] = [];
    for (const msg of this.messages.values()) {
      if (msg.conversationId === input.conversationId && msg.workspaceId === input.workspaceId) {
        if (typeof input.afterSeq === "number") {
          if (msg.seq > input.afterSeq) {
            list.push(msg);
          }
        } else {
          list.push(msg);
        }
      }
    }

    list.sort((a, b) => a.seq - b.seq);
    if (input.limit) {
      return list.slice(0, input.limit);
    }
    return list;
  }
}
