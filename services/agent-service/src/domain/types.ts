import {
  DEFAULT_AGENT_VOICE_SETTINGS,
  type AgentGraph,
  type AgentToolDefinition,
  type AgentVoiceSettings,
} from "@quickstart/contracts";

export type AgentChannels = {
  chat: boolean;
  voice: boolean;
};

export type AgentSnapshot = {
  name: string;
  description: string | null;
  instructions: string;
  environment: string;
  model_settings: Record<string, unknown>;
  channels: AgentChannels;
  tools: AgentToolDefinition[];
  voice: AgentVoiceSettings;
  draft_version: number;
  graph?: AgentGraph | null;
  release_notes?: string | null;
};

export type Agent = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  instructions: string;
  environment: string;
  modelSettings: Record<string, unknown>;
  channels: AgentChannels;
  tools: AgentToolDefinition[];
  voice: AgentVoiceSettings;
  version: number;
  productionVersionId: string | null;
  builderMode?: "legacy" | "canvas";
  draftGraph?: AgentGraph | null;
  graphSchemaVersion?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AgentVersion = {
  id: string;
  workspaceId: string;
  agentId: string;
  releaseNumber: number;
  snapshot: AgentSnapshot;
  releaseNotes?: string | null;
  createdBy: string;
  createdAt: Date;
};

export type VersionFieldDiff = {
  before: unknown;
  after: unknown;
};

export type AgentVersionDiff = {
  leftId: string;
  rightId: string;
  fields: Record<string, VersionFieldDiff>;
};

export type PublishResult = {
  version: AgentVersion;
  agent: Agent;
};

export type AgentJson = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  instructions: string;
  environment: string;
  model_settings: Record<string, unknown>;
  channels: AgentChannels;
  tools: AgentToolDefinition[];
  voice: AgentVoiceSettings;
  version: number;
  production_version_id: string | null;
  builder_mode?: "legacy" | "canvas";
  draft_graph?: AgentGraph | null;
  graph_schema_version?: number;
  created_at: string;
  updated_at: string;
};

export type AgentVersionJson = {
  id: string;
  workspace_id: string;
  agent_id: string;
  release_number: number;
  snapshot: AgentSnapshot;
  release_notes?: string | null;
  created_by: string;
  created_at: string;
};

export function snapshotFromAgent(agent: Agent, releaseNotes?: string | null): AgentSnapshot {
  return {
    name: agent.name,
    description: agent.description,
    instructions: agent.instructions,
    environment: agent.environment,
    model_settings: agent.modelSettings,
    channels: agent.channels,
    tools: agent.tools,
    voice: agent.voice ?? { ...DEFAULT_AGENT_VOICE_SETTINGS },
    draft_version: agent.version,
    graph: agent.draftGraph ?? null,
    release_notes: releaseNotes ?? null,
  };
}

export function toAgentJson(agent: Agent): AgentJson {
  return {
    id: agent.id,
    workspace_id: agent.workspaceId,
    name: agent.name,
    description: agent.description,
    instructions: agent.instructions,
    environment: agent.environment,
    model_settings: agent.modelSettings,
    channels: agent.channels,
    tools: agent.tools,
    voice: agent.voice ?? { ...DEFAULT_AGENT_VOICE_SETTINGS },
    version: agent.version,
    production_version_id: agent.productionVersionId,
    builder_mode: agent.builderMode ?? "legacy",
    draft_graph: agent.draftGraph ?? null,
    graph_schema_version: agent.graphSchemaVersion ?? 1,
    created_at: agent.createdAt.toISOString(),
    updated_at: agent.updatedAt.toISOString(),
  };
}

export function toAgentVersionJson(version: AgentVersion): AgentVersionJson {
  return {
    id: version.id,
    workspace_id: version.workspaceId,
    agent_id: version.agentId,
    release_number: version.releaseNumber,
    snapshot: version.snapshot,
    release_notes: version.releaseNotes ?? version.snapshot?.release_notes ?? null,
    created_by: version.createdBy,
    created_at: version.createdAt.toISOString(),
  };
}
