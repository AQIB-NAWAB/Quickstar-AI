/**
 * QuickStart AI Platform SDK Types
 */

export type ClientOptions = {
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
  timeoutMs?: number;
  workspaceId?: string;
  fetchImpl?: typeof fetch;
};

export type StreamEvent = {
  event: string;
  data: string;
  id?: string;
  retry?: number;
};

export type Agent = {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  model: string;
  temperature?: number;
  voice_id?: string;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  workspace_id: string;
  agent_id: string;
  status: "active" | "closed" | "handoff";
  metadata?: Record<string, unknown>;
  tags?: string[];
  created_at: string;
  updated_at: string;
};

export type MessageTurn = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type TelephonyNumber = {
  id: string;
  workspace_id: string;
  phone_number: string;
  agent_id: string;
  provider: "twilio" | "sip";
  status: "active" | "released";
};

export type DialOptions = {
  conversationId: string;
  toE164: string;
  fromE164?: string;
  agentId?: string;
  utteranceText?: string;
};

export type Campaign = {
  id: string;
  workspace_id: string;
  name: string;
  agent_id: string;
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "failed";
  caller_id?: string;
};

export type TargetInput = {
  phone: string;
  name?: string;
  email?: string;
  timezone?: string;
  custom_fields?: Record<string, string>;
};

export type WebhookSubscription = {
  id: string;
  workspace_id: string;
  url: string;
  events: string[];
  signing_secret?: string;
  created_at: string;
};

export type KnowledgeSource = {
  id: string;
  workspace_id: string;
  name: string;
  kind: "text" | "url" | "file";
  status: string;
  char_count: number;
};
