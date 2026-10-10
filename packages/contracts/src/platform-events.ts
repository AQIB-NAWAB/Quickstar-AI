export const PLATFORM_EVENTS_TOPIC = "quickstart.platform.events" as const;

export const PLATFORM_EVENT_TYPES = [
  "conversation.handed_off",
  "conversation.released",
  "message.appended",
  "agent.published",
] as const;

export type PlatformEventType = (typeof PLATFORM_EVENT_TYPES)[number];

export type PlatformEventEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> = {
  event_id: string;
  type: PlatformEventType;
  workspace_id: string;
  occurred_at: string;
  request_id: string | null;
  data: TData;
};

export type ConversationHandedOffData = {
  conversation_id: string;
  assignee_user_id: string;
};

export function isPlatformEventType(value: string): value is PlatformEventType {
  return (PLATFORM_EVENT_TYPES as readonly string[]).includes(value);
}
