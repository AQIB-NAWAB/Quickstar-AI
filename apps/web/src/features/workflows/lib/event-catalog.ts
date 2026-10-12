export interface EventCatalogItem {
  type: string;
  label: string;
  description: string;
  status: "declared" | "planned";
  availableFields: { path: string; label: string; type: "string" | "number" | "boolean" }[];
}

export const EVENT_CATALOG: EventCatalogItem[] = [
  // Declared platform events from @quickstart/contracts
  {
    type: "message.appended",
    label: "Message appended",
    description: "When a new message arrives in a conversation.",
    status: "declared",
    availableFields: [
      { path: "event.conversation_id", label: "Conversation ID", type: "string" },
      { path: "event.message.id", label: "Message ID", type: "string" },
      { path: "event.message.text", label: "Message text", type: "string" },
      { path: "event.message.role", label: "Message sender role", type: "string" },
    ],
  },
  {
    type: "conversation.handed_off",
    label: "Conversation handed off",
    description: "When a conversation is transferred to another user or agent.",
    status: "declared",
    availableFields: [
      { path: "event.conversation_id", label: "Conversation ID", type: "string" },
      { path: "event.assignee_user_id", label: "Assignee User ID", type: "string" },
    ],
  },
  {
    type: "conversation.released",
    label: "Conversation released",
    description: "When an operator or agent releases a conversation lock.",
    status: "declared",
    availableFields: [
      { path: "event.conversation_id", label: "Conversation ID", type: "string" },
    ],
  },
  {
    type: "agent.published",
    label: "Agent published",
    description: "When an agent draft is published to an immutable version.",
    status: "declared",
    availableFields: [
      { path: "event.agent_id", label: "Agent ID", type: "string" },
      { path: "event.version", label: "Published version number", type: "number" },
    ],
  },

  // Planned events (explicitly disabled, marked Planned)
  {
    type: "conversation.started",
    label: "Conversation started",
    description: "When a visitor or user opens a new conversation thread.",
    status: "planned",
    availableFields: [
      { path: "event.conversation_id", label: "Conversation ID", type: "string" },
    ],
  },
  {
    type: "lead.qualified",
    label: "Lead qualified",
    description: "When user intent qualifies as an actionable sales lead.",
    status: "planned",
    availableFields: [
      { path: "event.lead_id", label: "Lead ID", type: "string" },
    ],
  },
  {
    type: "message.flagged",
    label: "Message flagged",
    description: "When content moderation or guardrails flag a message turn.",
    status: "planned",
    availableFields: [
      { path: "event.flag_reason", label: "Flag reason", type: "string" },
    ],
  },
];

export function getEventCatalogItem(eventType: string): EventCatalogItem | undefined {
  return EVENT_CATALOG.find((item) => item.type === eventType);
}
