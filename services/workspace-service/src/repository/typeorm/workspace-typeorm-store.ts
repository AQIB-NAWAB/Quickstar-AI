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
        // Serialize competing updates on this workspace
        await manager.findOne(WorkspaceEntity, {
          where: { id: tenant.workspaceId },
          lock: { mode: "pessimistic_write" },
        });

        const entity = await manager.findOne(WorkspaceMembershipEntity, {
          where: { workspaceId: tenant.workspaceId, userId: targetUserId },
          lock: { mode: "pessimistic_write" },
        });
        if (!entity) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Workspace membership not found",
          });
        }

        // Transactional Last-Owner Protection on demotion
        if (entity.role === "owner" && newRole !== "owner") {
          const ownerCount = await manager.count(WorkspaceMembershipEntity, {
            where: { workspaceId: tenant.workspaceId, role: "owner" },
          });
          if (ownerCount <= 1) {
            throw new AppError({
              code: ErrorCode.CONFLICT,
              message: "Cannot demote the only workspace owner",
            });
          }
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

    async removeMember(
      tenant: TenantContext,
      targetUserId: string,
      audit?: { requestId: string; actorUserId: string },
    ) {
      return await dataSource.transaction(async (manager) => {
        // Serialize competing removals on this workspace
        await manager.findOne(WorkspaceEntity, {
          where: { id: tenant.workspaceId },
          lock: { mode: "pessimistic_write" },
        });

        const entity = await manager.findOne(WorkspaceMembershipEntity, {
          where: { workspaceId: tenant.workspaceId, userId: targetUserId },
          lock: { mode: "pessimistic_write" },
        });
        if (!entity) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Workspace member not found",
          });
        }

        // Transactional Last-Owner Protection on removal
        if (entity.role === "owner") {
          const ownerCount = await manager.count(WorkspaceMembershipEntity, {
            where: { workspaceId: tenant.workspaceId, role: "owner" },
          });
          if (ownerCount <= 1) {
            throw new AppError({
              code: ErrorCode.CONFLICT,
              message: "Cannot remove the only workspace owner",
            });
          }
        }

        await manager.delete(WorkspaceMembershipEntity, {
          id: entity.id,
        });

        if (audit?.requestId) {
          await insertAuditEntry((sql, params) => manager.query(sql, params), {
            workspaceId: tenant.workspaceId,
            actorUserId: audit.actorUserId,
            action: "member.removed",
            targetType: "membership",
            targetId: targetUserId,
            requestId: audit.requestId,
            metadata: {
              removed_role: entity.role,
              target_user_id: targetUserId,
            },
          });
        }

        return true;
      });
    },

    async transferOwnership(
      tenant: TenantContext,
      newOwnerUserId: string,
      currentOwnerUserId: string,
      audit?: { requestId: string },
    ) {
      return await dataSource.transaction(async (manager) => {
        // Serialize competing updates on this workspace
        await manager.findOne(WorkspaceEntity, {
          where: { id: tenant.workspaceId },
          lock: { mode: "pessimistic_write" },
        });

        const targetMember = await manager.findOne(WorkspaceMembershipEntity, {
          where: { workspaceId: tenant.workspaceId, userId: newOwnerUserId },
          lock: { mode: "pessimistic_write" },
        });
        if (!targetMember) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Target user is not a member of this workspace",
          });
        }

        const currentOwner = await manager.findOne(WorkspaceMembershipEntity, {
          where: { workspaceId: tenant.workspaceId, userId: currentOwnerUserId },
          lock: { mode: "pessimistic_write" },
        });
        if (!currentOwner || currentOwner.role !== "owner") {
          throw new AppError({
            code: ErrorCode.FORBIDDEN,
            message: "Only workspace owners can transfer ownership",
          });
        }

        const now = new Date();
        targetMember.role = "owner";
        targetMember.roleUpdatedAt = now;
        targetMember.roleUpdatedBy = currentOwnerUserId;
        await manager.save(targetMember);

        currentOwner.role = "admin";
        currentOwner.roleUpdatedAt = now;
        currentOwner.roleUpdatedBy = currentOwnerUserId;
        await manager.save(currentOwner);

        if (audit?.requestId) {
          await insertAuditEntry((sql, params) => manager.query(sql, params), {
            workspaceId: tenant.workspaceId,
            actorUserId: currentOwnerUserId,
            action: "workspace.ownership_transferred",
            targetType: "workspace",
            targetId: tenant.workspaceId,
            requestId: audit.requestId,
            metadata: {
              previous_owner: currentOwnerUserId,
              new_owner: newOwnerUserId,
            },
          });
        }

        return {
          previousOwner: toWorkspaceMembership(currentOwner),
          newOwner: toWorkspaceMembership(targetMember),
        };
      });
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

    async getInviteById(tenant: TenantContext, inviteId: string) {
      const entity = await dataSource.manager.findOne(WorkspaceInviteEntity, {
        where: { id: inviteId, workspaceId: tenant.workspaceId },
      });
      return entity ? toWorkspaceInvite(entity) : null;
    },

    async findInviteByHash(tokenHash: string) {
      const invite = await dataSource.manager.findOne(WorkspaceInviteEntity, {
        where: { tokenHash },
      });
      if (!invite) return null;

      const workspace = await dataSource.manager.findOne(WorkspaceEntity, {
        where: { id: invite.workspaceId },
      });
      if (!workspace) return null;

      return {
        invite: toWorkspaceInvite(invite),
        workspace: toWorkspace(workspace),
      };
    },

    async resendInvite(tenant: TenantContext, inviteId: string, newTokenHash: string, newExpiresAt: Date) {
      const invite = await dataSource.manager.findOne(WorkspaceInviteEntity, {
        where: { id: inviteId, workspaceId: tenant.workspaceId },
      });
      if (!invite) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Workspace invite not found",
        });
      }
      if (invite.acceptedAt) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Invitation has already been accepted",
        });
      }

      invite.tokenHash = newTokenHash;
      invite.expiresAt = newExpiresAt;
      await dataSource.manager.save(invite);
      return toWorkspaceInvite(invite);
    },

    async acceptInvite(tokenHash: string, acceptingUserId: string, acceptingEmail: string, audit?: { requestId: string }) {
      return await dataSource.transaction(async (manager) => {
        const invite = await manager.findOne(WorkspaceInviteEntity, {
          where: { tokenHash },
          lock: { mode: "pessimistic_write" },
        });

        if (!invite) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Invitation not found or invalid",
          });
        }

        if (invite.acceptedAt) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: "Invitation has already been accepted",
          });
        }

        if (invite.expiresAt.getTime() < Date.now()) {
          throw new AppError({
            code: ErrorCode.VALIDATION_FAILED,
            message: "Invitation has expired",
          });
        }

        if (invite.email.toLowerCase() !== acceptingEmail.toLowerCase()) {
          throw new AppError({
            code: ErrorCode.FORBIDDEN,
            message: `Invitation was issued for ${invite.email}, not ${acceptingEmail}`,
          });
        }

        const workspace = await manager.findOne(WorkspaceEntity, {
          where: { id: invite.workspaceId },
          lock: { mode: "pessimistic_write" },
        });
        if (!workspace) {
          throw new AppError({
            code: ErrorCode.NOT_FOUND,
            message: "Workspace no longer exists",
          });
        }

        const existingMembership = await manager.findOne(WorkspaceMembershipEntity, {
          where: { workspaceId: invite.workspaceId, userId: acceptingUserId },
          lock: { mode: "pessimistic_write" },
        });

        let membership: WorkspaceMembershipEntity;
        let previousRole: string | undefined;

        if (existingMembership) {
          previousRole = existingMembership.role;
          if (existingMembership.role !== "owner") {
            existingMembership.role = invite.role;
            existingMembership.roleUpdatedAt = new Date();
            existingMembership.roleUpdatedBy = invite.invitedBy;
            membership = await manager.save(existingMembership);
          } else {
            membership = existingMembership;
          }
        } else {
          const now = new Date();
          membership = manager.create(WorkspaceMembershipEntity, {
            id: randomUUID(),
            workspaceId: invite.workspaceId,
            userId: acceptingUserId,
            role: invite.role,
            roleUpdatedAt: now,
            roleUpdatedBy: invite.invitedBy,
            createdAt: now,
          });
          membership = await manager.save(membership);
        }

        invite.acceptedAt = new Date();
        invite.acceptedBy = acceptingUserId;
        await manager.save(invite);

        if (audit?.requestId) {
          await insertAuditEntry((sql, params) => manager.query(sql, params), {
            workspaceId: invite.workspaceId,
            actorUserId: acceptingUserId,
            action: "member.invite_accepted",
            targetType: "membership",
            targetId: acceptingUserId,
            requestId: audit.requestId,
            metadata: {
              invited_role: invite.role,
              previous_role: previousRole,
              invite_id: invite.id,
            },
          });
        }

        return {
          workspace: toWorkspace(workspace),
          membership: toWorkspaceMembership(membership),
          previousRole,
        };
      });
    },
  };
}
