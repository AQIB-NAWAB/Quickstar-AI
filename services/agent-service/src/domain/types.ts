export type AgentChannels = {
  chat: boolean;
  voice: boolean;
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
  version: number;
  createdAt: Date;
  updatedAt: Date;
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
  version: number;
  created_at: string;
  updated_at: string;
};

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
    version: agent.version,
    created_at: agent.createdAt.toISOString(),
    updated_at: agent.updatedAt.toISOString(),
  };
}
