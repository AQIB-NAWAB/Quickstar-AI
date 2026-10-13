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

function isGeneratedSubject(subject: string): boolean {
  return /^(anon|widget|eval):/i.test(subject) || /^[0-9a-f-]{36}$/i.test(subject);
}

export function conversationTitle(c: Conversation): string {
  const subject = c.subject_key?.trim() ?? "";
  if (!subject || isGeneratedSubject(subject)) {
    return "Website visitor";
  }
  return subject;
}

export function conversationRef(c: Conversation): string {
  return `#${c.id.replace(/-/g, "").slice(-6)}`;
}

export function formatConversationTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
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
