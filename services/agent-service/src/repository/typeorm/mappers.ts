import { DEFAULT_AGENT_VOICE_SETTINGS } from "@quickstart/contracts";
import type { CustomTool } from "@quickstart/contracts";
import type { Agent, AgentVersion } from "../../domain/types.js";
import type { AgentEntity } from "../entities/agent.entity.js";
import type { AgentVersionEntity } from "../entities/agent-version.entity.js";
import type { CustomToolEntity } from "../entities/custom-tool.entity.js";

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
    voice: entity.voice?.voice_mode
      ? entity.voice
      : { ...DEFAULT_AGENT_VOICE_SETTINGS, ...(entity.voice ?? {}) },
    version: entity.version,
    productionVersionId: entity.productionVersionId ?? null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toAgentVersion(entity: AgentVersionEntity): AgentVersion {
  const snapshot = entity.snapshot;
  return {
    id: entity.id,
    workspaceId: entity.workspaceId,
    agentId: entity.agentId,
    releaseNumber: entity.releaseNumber,
    snapshot: {
      ...snapshot,
      voice: snapshot.voice?.voice_mode
        ? snapshot.voice
        : { ...DEFAULT_AGENT_VOICE_SETTINGS, ...(snapshot.voice ?? {}) },
    },
    createdBy: entity.createdBy,
    createdAt: entity.createdAt,
  };
}

export function toCustomTool(entity: CustomToolEntity): CustomTool {
  return {
    id: entity.id,
    workspace_id: entity.workspaceId,
    name: entity.name,
    description: entity.description ?? "",
    kind: entity.kind,
    config: entity.config ?? {},
    created_by: entity.createdBy,
    created_at: entity.createdAt.toISOString(),
    updated_at: entity.updatedAt.toISOString(),
  };
}
