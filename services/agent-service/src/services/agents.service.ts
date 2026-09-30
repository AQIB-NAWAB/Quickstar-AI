import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Agent, AgentVersion, AgentVersionDiff, PublishResult } from "../domain/types.js";
import { validateAgentTools } from "../lib/validate-tools.js";
import type { AgentStore, CreateAgentInput, UpdateAgentInput } from "../repository/types.js";

export class AgentsService {
  constructor(private readonly store: AgentStore) {}

  async createAgent(tenant: TenantContext, input: CreateAgentInput): Promise<Agent> {
    if (!input.name || input.name.trim().length === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Agent name is required",
      });
    }
    const tools = input.tools !== undefined ? validateAgentTools(input.tools) : undefined;
    return this.store.createAgent(tenant, { ...input, tools });
  }

  async listAgents(tenant: TenantContext): Promise<Agent[]> {
    return this.store.listAgents(tenant);
  }

  async getAgent(tenant: TenantContext, agentId: string): Promise<Agent> {
    const agent = await this.store.getAgent(tenant, agentId);
    if (!agent) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent not found",
      });
    }
    return agent;
  }

  async updateAgent(tenant: TenantContext, agentId: string, input: UpdateAgentInput): Promise<Agent> {
    if (input.expectedVersion === undefined || !Number.isInteger(input.expectedVersion)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "expected_version is required and must be an integer",
      });
    }
    const tools = input.tools !== undefined ? validateAgentTools(input.tools) : undefined;
    return this.store.updateAgent(tenant, agentId, { ...input, tools });
  }

  async deleteAgent(tenant: TenantContext, agentId: string): Promise<void> {
    const deleted = await this.store.deleteAgent(tenant, agentId);
    if (!deleted) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent not found",
      });
    }
  }

  async publish(tenant: TenantContext, agentId: string, baseVersion: number): Promise<PublishResult> {
    if (!Number.isInteger(baseVersion)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "base_version is required and must be an integer",
      });
    }
    return this.store.publish(tenant, agentId, baseVersion);
  }

  async rollback(
    tenant: TenantContext,
    agentId: string,
    versionId: string,
  ): Promise<PublishResult> {
    if (!versionId?.trim()) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "version_id is required",
      });
    }
    return this.store.rollback(tenant, agentId, versionId.trim());
  }

  async listVersions(
    tenant: TenantContext,
    agentId: string,
    limit?: number,
  ): Promise<AgentVersion[]> {
    return this.store.listVersions(tenant, agentId, limit);
  }

  async getVersion(tenant: TenantContext, agentId: string, versionId: string): Promise<AgentVersion> {
    const version = await this.store.getVersion(tenant, agentId, versionId);
    if (!version) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent version not found",
      });
    }
    return version;
  }

  async diffVersions(
    tenant: TenantContext,
    agentId: string,
    leftId: string,
    rightId: string,
  ): Promise<AgentVersionDiff> {
    return this.store.diffVersions(tenant, agentId, leftId, rightId);
  }
}
