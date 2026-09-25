import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { Agent } from "../domain/types.js";
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
    return this.store.createAgent(tenant, input);
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
    return this.store.updateAgent(tenant, agentId, input);
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
}
