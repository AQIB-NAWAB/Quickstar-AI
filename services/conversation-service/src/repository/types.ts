import type { Conversation, Message } from "../domain/types.js";

export type CreateConversationInput = {
  workspaceId: string;
  agentId?: string | null;
};

export type AppendMessageInput = {
  workspaceId: string;
  conversationId: string;
  senderType: string;
  senderId: string;
  text: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown> | null;
};

export type ListMessagesInput = {
  workspaceId: string;
  conversationId: string;
  afterSeq?: number;
  limit?: number;
};

export type AppendMessageResult = {
  message: Message;
  deduplicated: boolean;
};

export interface ConversationStore {
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  getConversation(workspaceId: string, conversationId: string): Promise<Conversation | null>;
  listConversations(workspaceId: string, limit?: number): Promise<Conversation[]>;
  appendMessage(input: AppendMessageInput): Promise<AppendMessageResult>;
  listMessages(input: ListMessagesInput): Promise<Message[]>;
}
