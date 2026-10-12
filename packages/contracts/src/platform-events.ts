export const PLATFORM_EVENTS_TOPIC = "quickstart.platform.events" as const;

export const PLATFORM_EVENT_TYPES = [
  "conversation.handed_off",
  "conversation.released",
  "message.appended",
  "agent.published",
  "campaign.started",
  "campaign.paused",
  "campaign.completed",
  "campaign.target.attempted",
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

export type ConversationReleasedData = {
  conversation_id: string;
  released_by_user_id: string;
};

export type MessageAppendedData = {
  conversation_id: string;
  message: {
    id: string;
    text: string;
    role: string;
    seq: number;
  };
};

export type AgentPublishedData = {
  agent_id: string;
  version: number;
  version_id?: string;
};

export type CampaignStartedData = {
  campaign_id: string;
  agent_id: string;
  eligible_targets: number;
};

export type CampaignPausedData = {
  campaign_id: string;
  reason?: string;
};

export type CampaignCompletedData = {
  campaign_id: string;
  completed_targets: number;
  answered_targets: number;
};

export type CampaignTargetAttemptedData = {
  campaign_id: string;
  target_id: string;
  attempt_id: string;
  attempt_number: number;
  outcome: string;
};

export function isPlatformEventType(value: string): value is PlatformEventType {
  return (PLATFORM_EVENT_TYPES as readonly string[]).includes(value);
}
