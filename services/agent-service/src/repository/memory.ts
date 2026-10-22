import { randomUUID } from "node:crypto";
import type { TenantContext } from "@quickstart/auth";
import { DEFAULT_AGENT_VOICE_SETTINGS } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Agent, AgentVersion } from "../domain/types.js";
import { snapshotFromAgent } from "../domain/types.js";
import { diffSnapshots } from "../utils/version-diff.js";
import type { AgentStore, CreateAgentInput, UpdateAgentInput } from "./types.js";

const defaultChannels = { chat: true, voice: false };

export class MemoryAgentStore implements AgentStore {
  private agents = new Map<string, Agent>();
  private versions = new Map<string, AgentVersion>();

  async createAgent(tenant: TenantContext, input: CreateAgentInput): Promise<Agent> {
    const name = input.name.trim();
    for (const agent of this.agents.values()) {
      if (agent.workspaceId === tenant.workspaceId && agent.name === name) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: `Agent name '${name}' already exists in this workspace`,
        });
      }
    }
    const now = new Date();
    const agent: Agent = {
      id: randomUUID(),
      workspaceId: tenant.workspaceId,
      name,
      description: input.description ?? null,
      instructions: input.instructions ?? "",
      environment: input.environment ?? "draft",
      modelSettings: input.modelSettings ?? {},
      channels: input.channels ?? defaultChannels,
      tools: input.tools ?? [],
      voice: input.voice ?? { ...DEFAULT_AGENT_VOICE_SETTINGS },
      version: 1,
      productionVersionId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  async listAgents(tenant: TenantContext): Promise<Agent[]> {
    return [...this.agents.values()]
      .filter((a) => a.workspaceId === tenant.workspaceId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getAgent(tenant: TenantContext, agentId: string): Promise<Agent | null> {
    const agent = this.agents.get(agentId);
    if (!agent || agent.workspaceId !== tenant.workspaceId) {
      return null;
    }
    return agent;
  }

  async updateAgent(tenant: TenantContext, agentId: string, input: UpdateAgentInput): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent || agent.workspaceId !== tenant.workspaceId) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent not found",
      });
    }
    if (agent.version !== input.expectedVersion) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Agent was modified by another request; reload and retry",
      });
    }
    if (input.name !== undefined) {
      const name = input.name.trim();
      for (const other of this.agents.values()) {
        if (
          other.workspaceId === tenant.workspaceId &&
          other.id !== agentId &&
          other.name === name
        ) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: `Agent name '${name}' already exists in this workspace`,
          });
        }
      }
      agent.name = name;
    }
    if (input.description !== undefined) agent.description = input.description;
    if (input.instructions !== undefined) agent.instructions = input.instructions;
    if (input.environment !== undefined) agent.environment = input.environment;
    if (input.modelSettings !== undefined) agent.modelSettings = input.modelSettings;
    if (input.channels !== undefined) agent.channels = input.channels;
    if (input.tools !== undefined) agent.tools = input.tools;
    if (input.voice !== undefined) agent.voice = input.voice;
    if (input.builderMode !== undefined) agent.builderMode = input.builderMode;
    if (input.draftGraph !== undefined) agent.draftGraph = input.draftGraph;
    if (input.graphSchemaVersion !== undefined)
      agent.graphSchemaVersion = input.graphSchemaVersion;
    agent.version += 1;
    agent.updatedAt = new Date();
    return agent;
  }

  async updateGraph(
    tenant: TenantContext,
    agentId: string,
    graph: import("@quickstart/contracts").AgentGraph,
    expectedVersion: number,
    settings: import("@quickstart/contracts").GraphDraftSettings = {},
  ): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent || agent.workspaceId !== tenant.workspaceId) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent not found",
      });
    }
    if (agent.version !== expectedVersion) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Draft was modified by another user or session; reload and retry",
      });
    }
    if (settings.instructions !== undefined) agent.instructions = settings.instructions;
    if (settings.model_settings) agent.modelSettings = settings.model_settings;
    if (settings.channels) agent.channels = settings.channels;
    if (settings.voice) agent.voice = settings.voice;
    agent.draftGraph = graph;
    agent.builderMode = "canvas";
    agent.graphSchemaVersion = graph.schema_version ?? 1;
    agent.version += 1;
    agent.updatedAt = new Date();
    return agent;
  }

  async deleteAgent(tenant: TenantContext, agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent || agent.workspaceId !== tenant.workspaceId) {
      return false;
    }
    this.agents.delete(agentId);
    for (const [id, version] of this.versions) {
      if (version.agentId === agentId) {
        this.versions.delete(id);
      }
    }
    return true;
  }

  async publish(
    tenant: TenantContext,
    agentId: string,
    baseVersion: number,
    audit?: { requestId?: string; releaseNotes?: string },
  ) {
    const agent = this.agents.get(agentId);
    if (!agent || agent.workspaceId !== tenant.workspaceId) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent not found",
      });
    }
    if (agent.version !== baseVersion) {
      throw new AppError({
        code: ErrorCode.CONFLICT,
        message: "Agent was modified by another request; reload and retry",
      });
    }

    const releaseNumber =
      [...this.versions.values()].filter((v) => v.agentId === agentId).length + 1;
    const version: AgentVersion = {
      id: randomUUID(),
      workspaceId: tenant.workspaceId,
      agentId,
      releaseNumber,
      snapshot: snapshotFromAgent(agent, audit?.releaseNotes),
      releaseNotes: audit?.releaseNotes ?? null,
      createdBy: tenant.actorId,
      createdAt: new Date(),
    };
    this.versions.set(version.id, version);
    agent.productionVersionId = version.id;
    agent.updatedAt = new Date();

    return { version, agent: { ...agent } };
  }

  async rollback(tenant: TenantContext, agentId: string, versionId: string) {
    const agent = this.agents.get(agentId);
    if (!agent || agent.workspaceId !== tenant.workspaceId) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent not found",
      });
    }
    const version = this.versions.get(versionId);
    if (!version || version.agentId !== agentId || version.workspaceId !== tenant.workspaceId) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent version not found",
      });
    }
    agent.productionVersionId = versionId;
    agent.updatedAt = new Date();
    return { version, agent: { ...agent } };
  }

  async listVersions(tenant: TenantContext, agentId: string, limit = 50) {
    const agent = this.agents.get(agentId);
    if (!agent || agent.workspaceId !== tenant.workspaceId) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent not found",
      });
    }
    return [...this.versions.values()]
      .filter((v) => v.agentId === agentId && v.workspaceId === tenant.workspaceId)
      .sort((a, b) => b.releaseNumber - a.releaseNumber)
      .slice(0, limit);
  }

  async getVersion(tenant: TenantContext, agentId: string, versionId: string) {
    const version = this.versions.get(versionId);
    if (!version || version.agentId !== agentId || version.workspaceId !== tenant.workspaceId) {
      return null;
    }
    return version;
  }

  async diffVersions(tenant: TenantContext, agentId: string, leftId: string, rightId: string) {
    const left = await this.getVersion(tenant, agentId, leftId);
    const right = await this.getVersion(tenant, agentId, rightId);
    if (!left || !right) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent version not found",
      });
    }
    return diffSnapshots(leftId, rightId, left.snapshot, right.snapshot);
  }
}
