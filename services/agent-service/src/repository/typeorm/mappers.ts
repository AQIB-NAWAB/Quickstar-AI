import type { Agent } from "../../domain/types.js";
import type { AgentEntity } from "../entities/agent.entity.js";

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
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
