import type { Conversation, Message } from "../../domain/types.js";
import type { ConversationEntity, MessageEntity } from "../entities/index.js";

export function toConversation(entity: ConversationEntity): Conversation {
  return {
    id: entity.id,
    workspaceId: entity.workspaceId,
    agentId: entity.agentId,
    subjectKey: entity.subjectKey ?? null,
    lastSeq: entity.lastSeq,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toMessage(entity: MessageEntity): Message {
  return {
    id: entity.id,
    workspaceId: entity.workspaceId,
    conversationId: entity.conversationId,
    seq: entity.seq,
    senderType: entity.senderType,
    senderId: entity.senderId,
    text: entity.text,
    idempotencyKey: entity.idempotencyKey,
    metadata: entity.metadata ?? null,
    createdAt: entity.createdAt,
  };
}
