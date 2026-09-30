import type { AgentToolDefinition } from "@quickstart/contracts";

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
  draft_version: number;
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
  version: number;
  productionVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AgentVersion = {
  id: string;
  workspaceId: string;
  agentId: string;
  releaseNumber: number;
  snapshot: AgentSnapshot;
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
  version: number;
  production_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentVersionJson = {
  id: string;
  workspace_id: string;
  agent_id: string;
  release_number: number;
  snapshot: AgentSnapshot;
  created_by: string;
  created_at: string;
};

export function snapshotFromAgent(agent: Agent): AgentSnapshot {
  return {
    name: agent.name,
    description: agent.description,
    instructions: agent.instructions,
    environment: agent.environment,
    model_settings: agent.modelSettings,
    channels: agent.channels,
    tools: agent.tools,
    draft_version: agent.version,
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
    version: agent.version,
    production_version_id: agent.productionVersionId,
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
    created_by: version.createdBy,
    created_at: version.createdAt.toISOString(),
  };
}
