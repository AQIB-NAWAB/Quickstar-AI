import type { TenantContext } from "@quickstart/auth";
import type {
  AgentToolDefinition,
  AgentVoiceSettings,
  CustomTool,
  CustomToolInput,
  CustomToolUpdate,
} from "@quickstart/contracts";
import type { Agent, AgentVersion, AgentVersionDiff, PublishResult } from "../domain/types.js";

export type CreateAgentInput = {
  name: string;
  description?: string | null;
  instructions?: string;
  environment?: string;
  modelSettings?: Record<string, unknown>;
  channels?: Agent["channels"];
  tools?: AgentToolDefinition[];
  voice?: AgentVoiceSettings;
};

export type UpdateAgentInput = {
  name?: string;
  description?: string | null;
  instructions?: string;
  environment?: string;
  modelSettings?: Record<string, unknown>;
  channels?: Agent["channels"];
  tools?: AgentToolDefinition[];
  voice?: AgentVoiceSettings;
  expectedVersion: number;
};

export interface AgentStore {
  createAgent(tenant: TenantContext, input: CreateAgentInput): Promise<Agent>;
  listAgents(tenant: TenantContext): Promise<Agent[]>;
  getAgent(tenant: TenantContext, agentId: string): Promise<Agent | null>;
  updateAgent(tenant: TenantContext, agentId: string, input: UpdateAgentInput): Promise<Agent>;
  deleteAgent(tenant: TenantContext, agentId: string): Promise<boolean>;
  publish(
    tenant: TenantContext,
    agentId: string,
    baseVersion: number,
    audit?: { requestId: string },
  ): Promise<PublishResult>;
  rollback(tenant: TenantContext, agentId: string, versionId: string): Promise<PublishResult>;
  listVersions(tenant: TenantContext, agentId: string, limit?: number): Promise<AgentVersion[]>;
  getVersion(
    tenant: TenantContext,
    agentId: string,
    versionId: string,
  ): Promise<AgentVersion | null>;
  diffVersions(
    tenant: TenantContext,
    agentId: string,
    leftId: string,
    rightId: string,
  ): Promise<AgentVersionDiff>;
}

export interface CustomToolStore {
  createCustomTool(tenant: TenantContext, input: CustomToolInput): Promise<CustomTool>;
  listCustomTools(tenant: TenantContext): Promise<CustomTool[]>;
  getCustomTool(tenant: TenantContext, toolId: string): Promise<CustomTool | null>;
  updateCustomTool(
    tenant: TenantContext,
    toolId: string,
    input: CustomToolUpdate,
  ): Promise<CustomTool>;
  deleteCustomTool(tenant: TenantContext, toolId: string): Promise<boolean>;
  countCustomTools(tenant: TenantContext): Promise<number>;
}
