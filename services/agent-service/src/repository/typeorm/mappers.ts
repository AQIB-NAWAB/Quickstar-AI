import type { Agent, AgentVersion } from "../../domain/types.js";
import type { AgentEntity } from "../entities/agent.entity.js";
import type { AgentVersionEntity } from "../entities/agent-version.entity.js";

export function toAgent(entity: AgentEntity): Agent {
  return {
    id: entity.id,
    workspaceId: entity.workspaceId,
    name: entity.name,
    description: entity.description,
    instructions: entity.instructions,
    environment: entity.environment,
    modelSettings: entity.modelSettings ?? {},
    channels: entity.channels ?? { chat: true, voice: false },
    tools: entity.tools ?? [],
    version: entity.version,
    productionVersionId: entity.productionVersionId ?? null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toAgentVersion(entity: AgentVersionEntity): AgentVersion {
  return {
    id: entity.id,
    workspaceId: entity.workspaceId,
    agentId: entity.agentId,
    releaseNumber: entity.releaseNumber,
    snapshot: entity.snapshot,
    createdBy: entity.createdBy,
    createdAt: entity.createdAt,
  };
}
