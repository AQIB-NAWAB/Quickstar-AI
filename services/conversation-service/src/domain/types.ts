export type Conversation = {
  id: string;
  workspaceId: string;
  agentId: string | null;
  subjectKey: string | null;
  lastSeq: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  workspaceId: string;
  conversationId: string;
  seq: number;
  senderType: string;
  senderId: string;
  text: string;
  idempotencyKey: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type ConversationJson = {
  id: string;
  workspace_id: string;
  agent_id: string | null;
  subject_key: string | null;
  last_seq: number;
  created_at: string;
  updated_at: string;
};

export type MessageJson = {
  id: string;
  workspace_id: string;
  conversation_id: string;
  seq: number;
  sender_type: string;
  sender_id: string;
  text: string;
  idempotency_key: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export function toConversationJson(c: Conversation): ConversationJson {
  return {
    id: c.id,
    workspace_id: c.workspaceId,
    agent_id: c.agentId,
    subject_key: c.subjectKey,
    last_seq: c.lastSeq,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

export function toMessageJson(m: Message): MessageJson {
  return {
    id: m.id,
    workspace_id: m.workspaceId,
    conversation_id: m.conversationId,
    seq: m.seq,
    sender_type: m.senderType,
    sender_id: m.senderId,
    text: m.text,
    idempotency_key: m.idempotencyKey,
    metadata: m.metadata,
    created_at: m.createdAt.toISOString(),
  };
}
