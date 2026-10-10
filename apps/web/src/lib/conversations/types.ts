export type ConversationState = "bot" | "waiting" | "human";

export type Conversation = {
  id: string;
  workspace_id: string;
  agent_id: string | null;
  subject_key: string | null;
  state: ConversationState;
  assignee_user_id: string | null;
  last_seq: number;
  created_at: string;
  updated_at: string;
};

export type Message = {
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

export const INBOX_STATE_FILTERS: { id: "all" | ConversationState; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bot", label: "Bot" },
  { id: "waiting", label: "Waiting" },
  { id: "human", label: "Human" },
];

export function conversationTitle(c: Conversation): string {
  if (c.subject_key?.trim()) {
    return c.subject_key.trim();
  }
  return `Conversation ${c.id.slice(0, 8)}`;
}

export function stateLabel(state: ConversationState): string {
  switch (state) {
    case "bot":
      return "Bot";
    case "waiting":
      return "Waiting";
    case "human":
      return "Human";
  }
}

export function senderLabel(senderType: string): string {
  switch (senderType) {
    case "assistant":
      return "AI";
    case "human":
      return "Human";
    case "user":
      return "Visitor";
    case "system":
      return "System";
    default:
      return senderType;
  }
}
