import { randomUUID } from "node:crypto";
import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Agent } from "../domain/types.js";
import type { AgentStore, CreateAgentInput, UpdateAgentInput } from "./types.js";

const defaultChannels = { chat: true, voice: false };

export class MemoryAgentStore implements AgentStore {
  private agents = new Map<string, Agent>();

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
      version: 1,
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
    return true;
  }
}
