import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import type { TenantContext } from "@quickstart/auth";
import type { CustomToolInput, CustomToolUpdate } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { CustomToolStore } from "../types.js";
import { CustomToolEntity } from "../entities/index.js";
import { toCustomTool } from "./mappers.js";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export function createTypeOrmCustomToolStore(dataSource: DataSource): CustomToolStore {
  return {
    async createCustomTool(tenant: TenantContext, input: CustomToolInput) {
      const now = new Date();
      const entity = dataSource.manager.create(CustomToolEntity, {
        id: randomUUID(),
        workspaceId: tenant.workspaceId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        kind: input.kind,
        config: input.config,
        createdBy: tenant.actorId ?? "unknown",
        createdAt: now,
        updatedAt: now,
      });
      try {
        await dataSource.manager.save(entity);
        return toCustomTool(entity);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: `Custom tool '${input.name}' already exists in this workspace`,
          });
        }
        throw error;
      }
    },

    async listCustomTools(tenant: TenantContext) {
      const entities = await dataSource.manager.find(CustomToolEntity, {
        where: { workspaceId: tenant.workspaceId },
        order: { createdAt: "ASC" },
      });
      return entities.map(toCustomTool);
    },

    async getCustomTool(tenant: TenantContext, toolId: string) {
      const entity = await dataSource.manager.findOne(CustomToolEntity, {
        where: { id: toolId, workspaceId: tenant.workspaceId },
      });
      return entity ? toCustomTool(entity) : null;
    },

    async updateCustomTool(tenant: TenantContext, toolId: string, input: CustomToolUpdate) {
      const entity = await dataSource.manager.findOne(CustomToolEntity, {
        where: { id: toolId, workspaceId: tenant.workspaceId },
      });
      if (!entity) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: "Custom tool not found" });
      }
      if (input.name !== undefined) entity.name = input.name.trim();
      if (input.description !== undefined) entity.description = input.description.trim() || null;
      if (input.kind !== undefined) entity.kind = input.kind;
      if (input.config !== undefined) entity.config = input.config;
      entity.updatedAt = new Date();
      try {
        await dataSource.manager.save(entity);
        return toCustomTool(entity);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: `Custom tool '${input.name}' already exists in this workspace`,
          });
        }
        throw error;
      }
    },

    async deleteCustomTool(tenant: TenantContext, toolId: string) {
      const result = await dataSource.manager.delete(CustomToolEntity, {
        id: toolId,
        workspaceId: tenant.workspaceId,
      });
      return Boolean(result.affected && result.affected > 0);
    },

    async countCustomTools(tenant: TenantContext) {
      return dataSource.manager.count(CustomToolEntity, {
        where: { workspaceId: tenant.workspaceId },
      });
    },
  };
}
