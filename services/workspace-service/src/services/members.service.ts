import { createHash, randomBytes } from "node:crypto";
import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { WORKSPACE_ROLES, type WorkspaceRole } from "../domain/permissions.js";
import type { WorkspaceMembership, WorkspaceInvite } from "../domain/types.js";
import type { WorkspaceStore } from "../repository/types.js";

export class MembersService {
  constructor(private readonly store: WorkspaceStore) {}

  async listMembers(tenant: TenantContext): Promise<WorkspaceMembership[]> {
    return this.store.listMembers(tenant);
  }

  async getMember(tenant: TenantContext, targetUserId: string): Promise<WorkspaceMembership> {
    const mem = await this.store.getMembership(tenant, targetUserId);
    if (!mem) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Workspace member not found",
      });
    }
    return mem;
  }

  async updateMemberRole(
    tenant: TenantContext,
    targetUserId: string,
    newRole: WorkspaceRole,
  ): Promise<WorkspaceMembership> {
    if (!WORKSPACE_ROLES.includes(newRole)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Invalid workspace role '${newRole}'`,
      });
    }

    return this.store.updateMemberRole(tenant, targetUserId, newRole, tenant.actorId);
  }

  async removeMember(tenant: TenantContext, targetUserId: string): Promise<void> {
    const member = await this.store.getMembership(tenant, targetUserId);
    if (!member) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Workspace member not found",
      });
    }

    if (member.role === "owner") {
      const allMembers = await this.store.listMembers(tenant);
      const owners = allMembers.filter((m) => m.role === "owner");
      if (owners.length <= 1) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Cannot remove the only workspace owner",
        });
      }
    }

    await this.store.removeMember(tenant, targetUserId);
  }

  async createInvite(
    tenant: TenantContext,
    email: string,
    role: WorkspaceRole,
  ): Promise<{ invite: WorkspaceInvite; rawToken: string }> {
    if (!email || !email.includes("@")) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Valid email address is required",
      });
    }

    if (!WORKSPACE_ROLES.includes(role)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Invalid workspace role '${role}'`,
      });
    }

    const rawToken = `wsi_${randomBytes(24).toString("hex")}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await this.store.createInvite(tenant, {
      email,
      role,
      tokenHash,
      invitedBy: tenant.actorId,
      expiresAt,
    });

    return { invite, rawToken };
  }

  async listInvites(tenant: TenantContext): Promise<WorkspaceInvite[]> {
    return this.store.listInvites(tenant);
  }

  async deleteInvite(tenant: TenantContext, inviteId: string): Promise<void> {
    const deleted = await this.store.deleteInvite(tenant, inviteId);
    if (!deleted) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Workspace invite not found",
      });
    }
  }
}
