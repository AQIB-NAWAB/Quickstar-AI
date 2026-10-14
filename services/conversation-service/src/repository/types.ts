import type { UpsertToolCallBody, WorkspaceRole } from "@quickstart/contracts";
import type { ConversationState } from "../domain/conversation-state.js";
import type { ToolCall } from "../domain/tool-call.js";
import type { Conversation, Message } from "../domain/types.js";

export type ListConversationsOptions = {
  limit?: number;
  state?: ConversationState;
};

export type CreateConversationInput = {
  workspaceId: string;
  agentId?: string | null;
  subjectKey?: string | null;
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

export type UpsertToolCallInput = {
  workspaceId: string;
  conversationId: string;
  body: UpsertToolCallBody;
};

export interface ConversationStore {
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  getConversation(workspaceId: string, conversationId: string): Promise<Conversation | null>;
  listConversations(workspaceId: string, options?: ListConversationsOptions): Promise<Conversation[]>;
  takeHandoff(
    workspaceId: string,
    conversationId: string,
    assigneeUserId: string,
    requestId?: string | null,
  ): Promise<Conversation>;
  /** Move a bot conversation to waiting so the inbox can show the live call. */
  markVoiceWaiting(workspaceId: string, conversationId: string): Promise<Conversation | null>;
  releaseHandoff(
    workspaceId: string,
    conversationId: string,
    actorUserId: string,
    actorRole: WorkspaceRole,
  ): Promise<Conversation>;
  appendMessage(input: AppendMessageInput): Promise<AppendMessageResult>;
  listMessages(input: ListMessagesInput): Promise<Message[]>;
  upsertToolCall(input: UpsertToolCallInput): Promise<{ record: ToolCall; created: boolean }>;
  listToolCalls(
    workspaceId: string,
    conversationId: string,
    turnIdempotencyKey: string,
  ): Promise<ToolCall[]>;
}
