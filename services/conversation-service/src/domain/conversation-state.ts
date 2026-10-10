export const CONVERSATION_STATES = ["bot", "waiting", "human"] as const;
export type ConversationState = (typeof CONVERSATION_STATES)[number];

export const DEFAULT_CONVERSATION_STATE: ConversationState = "bot";

export function isConversationState(value: string): value is ConversationState {
  return (CONVERSATION_STATES as readonly string[]).includes(value);
}

export function canTakeFromState(state: ConversationState): boolean {
  return state === "bot" || state === "waiting";
}
