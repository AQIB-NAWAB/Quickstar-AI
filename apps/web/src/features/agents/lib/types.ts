export type AgentChannels = {
  chat: boolean;
  voice: boolean;
};

export type ToolParameterProperty = {
  type: string;
  description?: string;
  items?: { type: string };
  enum?: Array<string | number | boolean>;
};

export type ToolParameterSchema = {
  type: "object";
  properties?: Record<string, ToolParameterProperty>;
  required?: string[];
};

export type AgentHttpToolAuth = {
  type: "bearer_secret";
  secret_name: string;
};

export type AgentToolDefinitionBase = {
  id: string;
  name: string;
  description: string;
  parameters?: ToolParameterSchema;
  timeout_ms?: number;
  idempotent?: boolean;
};

export type AgentHttpToolDefinition = AgentToolDefinitionBase & {
  type: "http";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  base_url: string;
  allowed_hosts: string[];
  path_template?: string;
  headers?: Record<string, string>;
  auth?: AgentHttpToolAuth;
};

export type AgentBuiltinWebToolDefinition = AgentToolDefinitionBase & {
  type: "builtin_web";
  action: "scrape" | "search";
};

export type AgentMcpToolDefinition = AgentToolDefinitionBase & {
  type: "mcp";
  server_url: string;
  allowed_tool_names: string[];
};

export type AgentBuiltinLeadToolDefinition = AgentToolDefinitionBase & {
  type: "builtin_leads";
  action: "start" | "status" | "results" | "cancel";
};

export type AgentToolDefinition =
  | AgentBuiltinLeadToolDefinition
  | AgentHttpToolDefinition
  | AgentBuiltinWebToolDefinition
  | AgentMcpToolDefinition;

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
