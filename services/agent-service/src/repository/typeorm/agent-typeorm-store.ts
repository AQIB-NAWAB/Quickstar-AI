import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { insertAuditEntry } from "@quickstart/audit-writer";
import type { TenantContext } from "@quickstart/auth";
import { DEFAULT_AGENT_VOICE_SETTINGS } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { snapshotFromAgent } from "../../domain/types.js";
import { diffSnapshots } from "../../utils/version-diff.js";
import type { AgentStore, CreateAgentInput, UpdateAgentInput } from "../types.js";
import { AgentEntity, AgentVersionEntity } from "../entities/index.js";
import { toAgent, toAgentVersion } from "./mappers.js";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

const defaultChannels = { chat: true, voice: false };

export function createTypeOrmAgentStore(dataSource: DataSource): AgentStore {
  return {
    async createAgent(tenant: TenantContext, input: CreateAgentInput) {
      const now = new Date();
      const entity = dataSource.manager.create(AgentEntity, {
        id: randomUUID(),
        workspaceId: tenant.workspaceId,
        name: input.name.trim(),
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
      });
      try {
        await dataSource.manager.save(entity);
        return toAgent(entity);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: `Agent name '${input.name}' already exists in this workspace`,
          });
        }
        throw error;
      }
    },

    async listAgents(tenant: TenantContext) {
      const entities = await dataSource.manager.find(AgentEntity, {
        where: { workspaceId: tenant.workspaceId },
        order: { createdAt: "ASC" },
      });
      return entities.map(toAgent);
    },

    async getAgent(tenant: TenantContext, agentId: string) {
      const entity = await dataSource.manager.findOne(AgentEntity, {
        where: { id: agentId, workspaceId: tenant.workspaceId },
      });
      return entity ? toAgent(entity) : null;
    },

    async updateAgent(tenant: TenantContext, agentId: string, input: UpdateAgentInput) {
      const entity = await dataSource.manager.findOne(AgentEntity, {
        where: { id: agentId, workspaceId: tenant.workspaceId },
      });
      if (!entity) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Agent not found",
        });
      }
      if (entity.version !== input.expectedVersion) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Agent was modified by another request; reload and retry",
        });
      }

      if (input.name !== undefined) entity.name = input.name.trim();
      if (input.description !== undefined) entity.description = input.description;
      if (input.instructions !== undefined) entity.instructions = input.instructions;
      if (input.environment !== undefined) entity.environment = input.environment;
      if (input.modelSettings !== undefined) entity.modelSettings = input.modelSettings;
      if (input.channels !== undefined) entity.channels = input.channels;
      if (input.tools !== undefined) entity.tools = input.tools;
      if (input.voice !== undefined) entity.voice = input.voice;
      entity.version = entity.version + 1;
      entity.updatedAt = new Date();

      try {
        await dataSource.manager.save(entity);
        return toAgent(entity);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: `Agent name '${input.name}' already exists in this workspace`,
          });
        }
        throw error;
      }
    },

    async deleteAgent(tenant: TenantContext, agentId: string) {
      const result = await dataSource.manager.delete(AgentEntity, {
        id: agentId,
        workspaceId: tenant.workspaceId,
      });
      return Boolean(result.affected && result.affected > 0);
    },

    async publish(
      tenant: TenantContext,
      agentId: string,
      baseVersion: number,
      audit?: { requestId: string },
    ) {
      return await dataSource.transaction(async (manager) => {
        const entity = await manager.findOne(AgentEntity, {
          where: { id: agentId, workspaceId: tenant.workspaceId },
          lock: { mode: "pessimistic_write" },
        });
        if (!entity) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Agent not found",
          });
        }
        if (entity.version !== baseVersion) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: "Agent was modified by another request; reload and retry",
          });
        }

        const maxRow = await manager
          .createQueryBuilder(AgentVersionEntity, "v")
          .select("COALESCE(MAX(v.release_number), 0)", "max")
          .where("v.agent_id = :agentId AND v.workspace_id = :workspaceId", {
            agentId,
            workspaceId: tenant.workspaceId,
          })
          .getRawOne<{ max: string }>();
        const releaseNumber = Number(maxRow?.max ?? 0) + 1;

        const agent = toAgent(entity);
        const versionId = randomUUID();
        const versionEntity = manager.create(AgentVersionEntity, {
          id: versionId,
          workspaceId: tenant.workspaceId,
          agentId,
          releaseNumber,
          snapshot: snapshotFromAgent(agent),
          createdBy: tenant.actorId,
          createdAt: new Date(),
        });
        await manager.save(versionEntity);

        entity.productionVersionId = versionId;
        entity.updatedAt = new Date();
        await manager.save(entity);

        if (audit?.requestId) {
          await insertAuditEntry((sql, params) => manager.query(sql, params), {
            workspaceId: tenant.workspaceId,
            actorUserId: tenant.actorId,
            action: "agent.published",
            targetType: "agent",
            targetId: agentId,
            requestId: audit.requestId,
            metadata: {
              agent_version_id: versionId,
              release_number: releaseNumber,
              base_version: baseVersion,
            },
          });
        }

        return {
          version: toAgentVersion(versionEntity),
          agent: toAgent(entity),
        };
      });
    },

    async rollback(tenant: TenantContext, agentId: string, versionId: string) {
      return await dataSource.transaction(async (manager) => {
        const entity = await manager.findOne(AgentEntity, {
          where: { id: agentId, workspaceId: tenant.workspaceId },
          lock: { mode: "pessimistic_write" },
        });
        if (!entity) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Agent not found",
          });
        }

        const versionEntity = await manager.findOne(AgentVersionEntity, {
          where: { id: versionId, agentId, workspaceId: tenant.workspaceId },
        });
        if (!versionEntity) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Agent version not found",
          });
        }

        entity.productionVersionId = versionId;
        entity.updatedAt = new Date();
        await manager.save(entity);

        return {
          version: toAgentVersion(versionEntity),
          agent: toAgent(entity),
        };
      });
    },

    async listVersions(tenant: TenantContext, agentId: string, limit = 50) {
      const agent = await dataSource.manager.findOne(AgentEntity, {
        where: { id: agentId, workspaceId: tenant.workspaceId },
      });
      if (!agent) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Agent not found",
        });
      }

      const entities = await dataSource.manager.find(AgentVersionEntity, {
        where: { agentId, workspaceId: tenant.workspaceId },
        order: { releaseNumber: "DESC" },
        take: limit,
      });
      return entities.map(toAgentVersion);
    },

    async getVersion(tenant: TenantContext, agentId: string, versionId: string) {
      const entity = await dataSource.manager.findOne(AgentVersionEntity, {
        where: { id: versionId, agentId, workspaceId: tenant.workspaceId },
      });
      return entity ? toAgentVersion(entity) : null;
    },

    async diffVersions(tenant: TenantContext, agentId: string, leftId: string, rightId: string) {
      const left = await dataSource.manager.findOne(AgentVersionEntity, {
        where: { id: leftId, agentId, workspaceId: tenant.workspaceId },
      });
      const right = await dataSource.manager.findOne(AgentVersionEntity, {
        where: { id: rightId, agentId, workspaceId: tenant.workspaceId },
      });
      if (!left || !right) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Agent version not found",
        });
      }
      return diffSnapshots(leftId, rightId, left.snapshot, right.snapshot);
    },
  };
}
