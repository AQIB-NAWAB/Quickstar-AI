import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { insertAuditEntry } from "@quickstart/audit-writer";
import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { WorkspaceRole } from "../../domain/permissions.js";
import type {
  WorkspaceStore,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  CreateInviteInput,
} from "../types.js";
import {
  WorkspaceEntity,
  WorkspaceMembershipEntity,
  WorkspaceInviteEntity,
} from "../entities/index.js";
import {
  toWorkspace,
  toWorkspaceMembership,
  toWorkspaceInvite,
} from "./mappers.js";

export function createTypeOrmWorkspaceStore(dataSource: DataSource): WorkspaceStore {
  return {
    async createWorkspace(input: CreateWorkspaceInput) {
      return await dataSource.transaction(async (manager) => {
        const existing = await manager.findOne(WorkspaceEntity, {
          where: { orgId: input.orgId, slug: input.slug },
        });
        if (existing) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: `Workspace slug '${input.slug}' already exists in this organization`,
          });
        }

        const workspaceId = randomUUID();
        const now = new Date();

        const wsEntity = manager.create(WorkspaceEntity, {
          id: workspaceId,
          orgId: input.orgId,
          name: input.name,
          slug: input.slug,
          createdAt: now,
          updatedAt: now,
        });
        await manager.save(wsEntity);

        const memEntity = manager.create(WorkspaceMembershipEntity, {
          id: randomUUID(),
          workspaceId,
          userId: input.ownerUserId,
          role: "owner",
          roleUpdatedAt: now,
          roleUpdatedBy: null,
          createdAt: now,
        });
        await manager.save(memEntity);

        return {
          workspace: toWorkspace(wsEntity),
          membership: toWorkspaceMembership(memEntity),
        };
      });
    },

    async listWorkspacesByOrg(orgId: string, actorUserId: string) {
      const entities = await dataSource.manager
        .createQueryBuilder(WorkspaceEntity, "w")
        .innerJoin(
          WorkspaceMembershipEntity,
          "m",
          "m.workspace_id = w.id AND m.user_id = :userId",
          { userId: actorUserId },
        )
        .where("w.org_id = :orgId", { orgId })
        .orderBy("w.created_at", "ASC")
        .getMany();

      return entities.map(toWorkspace);
    },

    async getWorkspace(tenant: TenantContext) {
      const entity = await dataSource.manager.findOne(WorkspaceEntity, {
        where: { id: tenant.workspaceId },
      });
      return entity ? toWorkspace(entity) : null;
    },

    async updateWorkspace(tenant: TenantContext, input: UpdateWorkspaceInput) {
      const entity = await dataSource.manager.findOne(WorkspaceEntity, {
        where: { id: tenant.workspaceId },
      });
      if (!entity) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Workspace not found",
        });
      }

      if (input.slug && input.slug !== entity.slug) {
        const clash = await dataSource.manager.findOne(WorkspaceEntity, {
          where: { orgId: entity.orgId, slug: input.slug },
        });
        if (clash && clash.id !== entity.id) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: `Workspace slug '${input.slug}' already exists in this organization`,
          });
        }
        entity.slug = input.slug;
      }

      if (input.name) {
        entity.name = input.name;
      }
      entity.updatedAt = new Date();

      await dataSource.manager.save(entity);
      return toWorkspace(entity);
    },

    async deleteWorkspace(tenant: TenantContext) {
      const result = await dataSource.manager.delete(WorkspaceEntity, {
        id: tenant.workspaceId,
      });
      return Boolean(result.affected && result.affected > 0);
    },

    async listMembers(tenant: TenantContext) {
      const entities = await dataSource.manager.find(WorkspaceMembershipEntity, {
        where: { workspaceId: tenant.workspaceId },
        order: { createdAt: "ASC" },
      });
      return entities.map(toWorkspaceMembership);
    },

    async getMembership(tenant: TenantContext, targetUserId: string) {
      const entity = await dataSource.manager.findOne(WorkspaceMembershipEntity, {
        where: { workspaceId: tenant.workspaceId, userId: targetUserId },
      });
      return entity ? toWorkspaceMembership(entity) : null;
    },

    async updateMemberRole(
      tenant: TenantContext,
      targetUserId: string,
      newRole: WorkspaceRole,
      updatedByUserId: string,
      audit?: { requestId: string; previousRole?: WorkspaceRole },
    ) {
      return await dataSource.transaction(async (manager) => {
        const entity = await manager.findOne(WorkspaceMembershipEntity, {
          where: { workspaceId: tenant.workspaceId, userId: targetUserId },
        });
        if (!entity) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Workspace membership not found",
          });
        }

        const previousRole = audit?.previousRole ?? entity.role;
        entity.role = newRole;
        entity.roleUpdatedAt = new Date();
        entity.roleUpdatedBy = updatedByUserId;

        await manager.save(entity);

        if (audit?.requestId) {
          await insertAuditEntry((sql, params) => manager.query(sql, params), {
            workspaceId: tenant.workspaceId,
            actorUserId: updatedByUserId,
            action: "member.role_updated",
            targetType: "membership",
            targetId: targetUserId,
            requestId: audit.requestId,
            metadata: {
              previous_role: previousRole,
              new_role: newRole,
              target_user_id: targetUserId,
            },
          });
        }

        return toWorkspaceMembership(entity);
      });
    },

    async removeMember(tenant: TenantContext, targetUserId: string) {
      const result = await dataSource.manager.delete(WorkspaceMembershipEntity, {
        workspaceId: tenant.workspaceId,
        userId: targetUserId,
      });
      return Boolean(result.affected && result.affected > 0);
    },

    async createInvite(tenant: TenantContext, input: CreateInviteInput) {
      const now = new Date();
      const entity = dataSource.manager.create(WorkspaceInviteEntity, {
        id: randomUUID(),
        workspaceId: tenant.workspaceId,
        email: input.email.toLowerCase(),
        role: input.role,
        tokenHash: input.tokenHash,
        invitedBy: input.invitedBy,
        expiresAt: input.expiresAt,
        createdAt: now,
      });
      await dataSource.manager.save(entity);
      return toWorkspaceInvite(entity);
    },

    async listInvites(tenant: TenantContext) {
      const entities = await dataSource.manager.find(WorkspaceInviteEntity, {
        where: { workspaceId: tenant.workspaceId },
        order: { createdAt: "DESC" },
      });
      return entities.map(toWorkspaceInvite);
    },

    async deleteInvite(tenant: TenantContext, inviteId: string) {
      const result = await dataSource.manager.delete(WorkspaceInviteEntity, {
        id: inviteId,
        workspaceId: tenant.workspaceId,
      });
      return Boolean(result.affected && result.affected > 0);
    },
  };
}
