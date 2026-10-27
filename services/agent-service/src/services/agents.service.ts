import {
  normalizeAgentGraph,
  isAgentGraphShape,
  validateAgentConfiguration,
} from "@quickstart/contracts";
import type { TenantContext } from "@quickstart/auth";
import { s2sProfileAllowed } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  Agent,
  AgentEnvironmentComparison,
  AgentReleaseReadiness,
  AgentVersion,
  AgentVersionDiff,
  PublishResult,
} from "../domain/types.js";
import type { SecretReadinessClient } from "../clients/secrets-readiness.client.js";
import { validateAgentTools } from "../lib/validate-tools.js";
import { snapshotFromAgent } from "../domain/types.js";
import type { AgentStore, CreateAgentInput, UpdateAgentInput } from "../repository/types.js";

export class AgentsService {
  constructor(
    private readonly store: AgentStore,
    private readonly secrets?: SecretReadinessClient,
  ) {}

  async createAgent(tenant: TenantContext, input: CreateAgentInput): Promise<Agent> {
    if (!input.name || input.name.trim().length === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Agent name is required",
      });
    }
    const tools = input.tools !== undefined ? validateAgentTools(input.tools) : undefined;
    const configuration =
      input.configuration !== undefined
        ? validateAgentConfiguration(input.configuration)
        : undefined;
    return this.store.createAgent(tenant, { ...input, tools, configuration });
  }

  async listAgents(
    tenant: TenantContext,
    options?: { includeArchived?: boolean; limit?: number; cursor?: string },
  ) {
    return this.store.listAgents(tenant, options);
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
    const configuration =
      input.configuration !== undefined
        ? validateAgentConfiguration(input.configuration)
        : undefined;
    return this.store.updateAgent(tenant, agentId, { ...input, tools, configuration });
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
    const agent = await this.getAgent(tenant, agentId);
    if (agent.productionVersionId || agent.canaryVersionId || agent.scheduledVersionId) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Unpublish the live release before deleting this agent",
      });
    }
    if (!agent.archivedAt) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Archive the agent before deleting it",
      });
    }
    const deleted = await this.store.deleteAgent(tenant, agentId);
    if (!deleted) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Agent not found",
      });
    }
  }

  async archiveAgent(tenant: TenantContext, agentId: string, archived: boolean): Promise<Agent> {
    return this.store.archiveAgent(tenant, agentId, archived);
  }

  async setCanary(
    tenant: TenantContext,
    agentId: string,
    versionId: string | null,
    percentage: number,
  ): Promise<Agent> {
    if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "canary_percentage must be an integer between 0 and 100",
      });
    }
    if (percentage > 0 && !versionId) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "version_id is required when canary traffic is enabled",
      });
    }
    return this.store.setCanary(tenant, agentId, versionId?.trim() || null, percentage);
  }

  async scheduleRelease(
    tenant: TenantContext,
    agentId: string,
    versionId: string,
    publishAt: string,
  ): Promise<Agent> {
    const date = new Date(publishAt);
    if (!versionId?.trim() || !Number.isFinite(date.getTime())) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "version_id and a valid publish_at timestamp are required",
      });
    }
    const agent = await this.getAgent(tenant, agentId);
    if (agent.archivedAt) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Restore the agent before scheduling a release",
      });
    }
    const readiness = await this.getReleaseReadiness(tenant, agentId);
    if (!readiness.ready) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Scheduling is blocked: ${readiness.blockers.map((blocker) => blocker.message).join("; ")}`,
      });
    }
    return this.store.scheduleRelease(tenant, agentId, versionId.trim(), date);
  }

  async applyDueSchedules(now = new Date()): Promise<number> {
    return this.store.applyDueSchedules(now);
  }

  async getEnvironmentComparison(
    tenant: TenantContext,
    agentId: string,
  ): Promise<AgentEnvironmentComparison> {
    const agent = await this.getAgent(tenant, agentId);
    const [staging, production, canary] = await Promise.all(
      [agent.scheduledVersionId, agent.productionVersionId, agent.canaryVersionId].map(
        (versionId) =>
          versionId ? this.store.getVersion(tenant, agentId, versionId) : Promise.resolve(null),
      ),
    );
    return {
      draft: snapshotFromAgent(agent),
      staging,
      production,
      canary,
    };
  }

  async archiveAgents(
    tenant: TenantContext,
    agentIds: string[],
    archived: boolean,
  ): Promise<Agent[]> {
    const ids = [...new Set(agentIds.filter((id) => typeof id === "string" && id.trim()))];
    if (ids.length === 0 || ids.length > 100) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "agent_ids must contain between 1 and 100 agent IDs",
      });
    }
    const agents = await Promise.all(ids.map((id) => this.getAgent(tenant, id)));
    if (
      archived &&
      agents.some(
        (agent) => agent.productionVersionId || agent.canaryVersionId || agent.scheduledVersionId,
      )
    ) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Unpublish live releases before archiving those agents",
      });
    }
    return Promise.all(ids.map((id) => this.store.archiveAgent(tenant, id, archived)));
  }

  async getReleaseReadiness(
    tenant: TenantContext,
    agentId: string,
  ): Promise<AgentReleaseReadiness> {
    const agent = await this.getAgent(tenant, agentId);
    const blockers: Array<{ code: string; message: string }> = [];
    const warnings: string[] = [];

    if (agent.archivedAt) {
      blockers.push({ code: "ARCHIVED", message: "Restore the agent before publishing it" });
    }
    if (!agent.channels.chat && !agent.channels.voice) {
      blockers.push({ code: "NO_CHANNEL", message: "Enable at least one delivery channel" });
    }

    try {
      validateAgentTools(agent.tools);
    } catch (error) {
      blockers.push({
        code: "INVALID_TOOLS",
        message: error instanceof Error ? error.message : "Tool configuration is invalid",
      });
    }

    try {
      validateAgentConfiguration(agent.configuration);
    } catch (error) {
      blockers.push({
        code: "INVALID_CONFIGURATION",
        message: error instanceof Error ? error.message : "Agent configuration is invalid",
      });
    }

    if (agent.builderMode === "canvas") {
      if (!agent.draftGraph) {
        blockers.push({
          code: "GRAPH_MISSING",
          message: "Canvas agents require a graph before publishing",
        });
      } else {
        const { validateAgentGraph } = await import("@quickstart/contracts");
        const validation = validateAgentGraph(agent.draftGraph, {
          availableTools: agent.tools.map((tool) => tool.name),
          availableToolIds: agent.tools
            .filter((tool) => tool.type === "http")
            .map((tool) => tool.id),
          requirePublishReady: true,
        });
        if (!validation.valid) {
          blockers.push({
            code: "INVALID_GRAPH",
            message: `Graph has ${validation.summary.errors} publish-blocking issue(s)`,
          });
        }
      }
    }

    const knowledgeEnabled =
      agent.configuration.knowledge.enabled ||
      Boolean((agent.modelSettings as { knowledge_enabled?: boolean }).knowledge_enabled);
    const s2sCheck = s2sProfileAllowed({
      voice_mode: agent.voice.voice_mode,
      toolsCount: agent.tools.length,
      knowledgeEnabled,
    });
    if (!s2sCheck.ok) {
      blockers.push({ code: "MODEL_PROFILE", message: s2sCheck.reason });
    }
    if (
      agent.tools.some(
        (tool) => tool.policy?.risk === "write" && tool.policy.confirmation === "never",
      )
    ) {
      warnings.push("One or more write tools can execute without confirmation");
    }

    const requiredSecrets = [
      ...new Set(
        agent.tools
          .filter((tool): tool is Extract<typeof tool, { type: "http" }> => tool.type === "http")
          .map((tool) => tool.auth?.secret_name)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    if (requiredSecrets.length > 0) {
      if (!this.secrets) {
        blockers.push({
          code: "SECRETS_CHECK_UNAVAILABLE",
          message: "Cannot verify tool secrets in this environment",
        });
      } else {
        try {
          const available = await this.secrets.listNames(agent.workspaceId);
          const missing = requiredSecrets.filter((name) => !available.has(name));
          if (missing.length > 0) {
            blockers.push({
              code: "MISSING_SECRET",
              message: `Create the required workspace secret(s): ${missing.join(", ")}`,
            });
          }
        } catch {
          blockers.push({
            code: "SECRETS_SERVICE_UNAVAILABLE",
            message: "Secrets service is unavailable",
          });
        }
      }
    }

    return { ready: blockers.length === 0, blockers, warnings };
  }

  async publish(
    tenant: TenantContext,
    agentId: string,
    baseVersion: number,
    audit?: {
      requestId?: string;
      releaseNotes?: string;
      approval?: { approved: boolean; note?: string };
      completedChecklist?: string[];
    },
  ): Promise<PublishResult> {
    if (!Number.isInteger(baseVersion)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "base_version is required and must be an integer",
      });
    }
    const agent = await this.getAgent(tenant, agentId);

    const readiness = await this.getReleaseReadiness(tenant, agentId);
    if (!readiness.ready) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Publishing is blocked: ${readiness.blockers.map((blocker) => blocker.message).join("; ")}`,
      });
    }

    const releasePolicy = agent.configuration.release;
    const completedChecklist = new Set(audit?.completedChecklist ?? []);
    const missingChecklist = releasePolicy.required_checklist.filter(
      (item) => !completedChecklist.has(item),
    );
    if (missingChecklist.length > 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Publishing requires completing the release checklist: ${missingChecklist.join(", ")}`,
      });
    }
    if (releasePolicy.require_approval && audit?.approval?.approved !== true) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Publishing requires an explicit release approval",
      });
    }

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

    const knowledgeEnabled =
      agent.configuration.knowledge.enabled ||
      Boolean((agent.modelSettings as { knowledge_enabled?: boolean }).knowledge_enabled);
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
