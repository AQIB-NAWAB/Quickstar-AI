import type { TenantContext } from "@quickstart/auth";
import type { Agent, AgentChannels } from "../domain/types.js";

export type CreateAgentInput = {
  name: string;
  description?: string | null;
  instructions?: string;
  environment?: string;
  modelSettings?: Record<string, unknown>;
  channels?: AgentChannels;
};

export type UpdateAgentInput = {
  name?: string;
  description?: string | null;
  instructions?: string;
  environment?: string;
  modelSettings?: Record<string, unknown>;
  channels?: AgentChannels;
  expectedVersion: number;
};

export interface AgentStore {
  createAgent(tenant: TenantContext, input: CreateAgentInput): Promise<Agent>;
  listAgents(tenant: TenantContext): Promise<Agent[]>;
  getAgent(tenant: TenantContext, agentId: string): Promise<Agent | null>;
  updateAgent(tenant: TenantContext, agentId: string, input: UpdateAgentInput): Promise<Agent>;
  deleteAgent(tenant: TenantContext, agentId: string): Promise<boolean>;
}
