export type AgentChannels = {
  chat: boolean;
  voice: boolean;
};

export type AgentToolDefinition = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
};

export type AgentSnapshot = {
  name: string;
  description: string | null;
  instructions: string;
  environment: string;
  model_settings: Record<string, unknown>;
  channels: AgentChannels;
  tools: AgentToolDefinition[];
  draft_version: number;
};

export type AgentVoiceSettings = {
  voice_mode: "cascade" | "s2s";
  language: string;
  tts_voice_id: string;
  max_response_chars: number;
  turn_detection_profile_id: string;
  recording_enabled: boolean;
};

export type Agent = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  instructions: string;
  environment: string;
  model_settings: Record<string, unknown>;
  channels: AgentChannels;
  tools: AgentToolDefinition[];
  voice?: AgentVoiceSettings;
  version: number;
  production_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentVersion = {
  id: string;
  workspace_id: string;
  agent_id: string;
  release_number: number;
  snapshot: AgentSnapshot;
  created_by: string;
  created_at: string;
};

export type VersionFieldDiff = {
  before: unknown;
  after: unknown;
};

export type AgentVersionDiff = {
  left_id: string;
  right_id: string;
  fields: Record<string, VersionFieldDiff>;
};

export type ApiError = {
  code: string;
  message: string;
  request_id?: string;
};
