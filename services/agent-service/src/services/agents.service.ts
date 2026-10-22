import { normalizeAgentGraph, isAgentGraphShape } from "@quickstart/contracts";
import type { TenantContext } from "@quickstart/auth";
import { s2sProfileAllowed } from "@quickstart/contracts";
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

  async updateAgent(
    tenant: TenantContext,
    agentId: string,
    input: UpdateAgentInput,
  ): Promise<Agent> {
    if (input.expectedVersion === undefined || !Number.isInteger(input.expectedVersion)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "expected_version is required and must be an integer",
      });
    }
    const tools = input.tools !== undefined ? validateAgentTools(input.tools) : undefined;
    return this.store.updateAgent(tenant, agentId, { ...input, tools });
  }

  async updateGraph(
    tenant: TenantContext,
    agentId: string,
    graph: import("@quickstart/contracts").AgentGraph,
    expectedVersion: number,
    settings: import("@quickstart/contracts").GraphDraftSettings = {},
  ): Promise<Agent> {
    if (expectedVersion === undefined || !Number.isInteger(expectedVersion)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "expected_version is required and must be an integer",
      });
    }
    if (!isAgentGraphShape(graph)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "graph must contain a valid nodes array",
      });
    }
    if (graph.nodes.length > 250) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Graph exceeds maximum allowable node limit (250 nodes)",
      });
    }
    if (Array.isArray(graph.edges) && graph.edges.length > 500) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Graph exceeds maximum allowable edge limit (500 edges)",
      });
    }

    if (
      !settings ||
      typeof settings !== "object" ||
      (settings.instructions !== undefined &&
        (typeof settings.instructions !== "string" || settings.instructions.length > 64000)) ||
      (settings.channels &&
        (typeof settings.channels.chat !== "boolean" ||
          typeof settings.channels.voice !== "boolean")) ||
      (settings.model_settings &&
        (typeof settings.model_settings !== "object" || Array.isArray(settings.model_settings)))
    )
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "Invalid agent settings" });
    return this.store.updateGraph(
      tenant,
      agentId,
      normalizeAgentGraph(graph),
      expectedVersion,
      settings,
    );
  }

  async validateGraph(
    tenant: TenantContext,
    agentId: string,
    graph: import("@quickstart/contracts").AgentGraph,
  ) {
    const agent = await this.getAgent(tenant, agentId);
    const availableTools = agent.tools?.map((t) => t.name) ?? [];
    const { validateAgentGraph } = await import("@quickstart/contracts");
    return validateAgentGraph(graph, {
      availableTools,
      availableToolIds: agent.tools?.filter((t) => t.type === "http").map((t) => t.id) ?? [],
    });
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

  async publish(
    tenant: TenantContext,
    agentId: string,
    baseVersion: number,
    audit?: { requestId?: string; releaseNotes?: string },
  ): Promise<PublishResult> {
    if (!Number.isInteger(baseVersion)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "base_version is required and must be an integer",
      });
    }
    const agent = await this.getAgent(tenant, agentId);

    // If agent is a canvas graph agent, validate before publishing
    if (agent.builderMode === "canvas" && agent.draftGraph) {
      const { validateAgentGraph } = await import("@quickstart/contracts");
      const validation = validateAgentGraph(agent.draftGraph, {
        availableTools: agent.tools?.map((t) => t.name) ?? [],
        availableToolIds: agent.tools?.filter((t) => t.type === "http").map((t) => t.id) ?? [],
        requirePublishReady: true,
      });
      if (!validation.valid) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: `Publishing is blocked by ${validation.summary.errors} configuration issue(s).`,
        });
      }
    }

    const knowledgeEnabled = Boolean(
      (agent.modelSettings as { knowledge_enabled?: boolean }).knowledge_enabled,
    );
    const s2sCheck = s2sProfileAllowed({
      voice_mode: agent.voice.voice_mode,
      toolsCount: agent.tools.length,
      knowledgeEnabled,
    });
    if (!s2sCheck.ok) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: s2sCheck.reason,
      });
    }
    return this.store.publish(tenant, agentId, baseVersion, audit);
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

  async getVersion(
    tenant: TenantContext,
    agentId: string,
    versionId: string,
  ): Promise<AgentVersion> {
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
