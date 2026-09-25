import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { AgentStore, CreateAgentInput, UpdateAgentInput } from "../types.js";
import { AgentEntity } from "../entities/index.js";
import { toAgent } from "./mappers.js";

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
        version: 1,
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
  };
}
