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

function isGeneratedSubject(subject: string): boolean {
  return /^(anon|widget|eval):/i.test(subject) || /^[0-9a-f-]{36}$/i.test(subject);
}

/** Widget sessions store the visitor as `Name <email>`. */
export function visitorIdentity(c: Conversation): { name: string; email: string } | null {
  const subject = c.subject_key?.trim() ?? "";
  const match = /^(.*)\s<([^<>\s]+@[^<>\s]+)>$/.exec(subject);
  if (!match) return null;
  const name = match[1].trim();
  const email = match[2].trim();
  if (!name || !email) return null;
  return { name, email };
}

export function conversationTitle(c: Conversation): string {
  const identity = visitorIdentity(c);
  if (identity) return identity.name;
  const subject = c.subject_key?.trim() ?? "";
  if (!subject || isGeneratedSubject(subject)) {
    return "Website visitor";
  }
  return subject;
}

export function conversationRef(c: Conversation): string {
  return `#${c.id.replace(/-/g, "").slice(-6)}`;
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
