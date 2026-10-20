import { createHash, randomBytes } from "node:crypto";
import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { WORKSPACE_ROLES, type WorkspaceRole } from "../domain/permissions.js";
import type { WorkspaceMembership, WorkspaceInvite } from "../domain/types.js";
import type { WorkspaceStore } from "../repository/types.js";

import { inviteEmailDelivery } from "../utils/invite-email-delivery.js";

export type MembershipCacheHooks = {
  onMembershipChanged(workspaceId: string, userId: string): Promise<void>;
};

export class MembersService {
  constructor(
    private readonly store: WorkspaceStore,
    private readonly cacheHooks?: MembershipCacheHooks,
  ) {}

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
    audit?: { requestId: string },
  ): Promise<WorkspaceMembership> {
    if (!WORKSPACE_ROLES.includes(newRole)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Invalid workspace role '${newRole}'`,
      });
    }

    const existing = await this.store.getMembership(tenant, targetUserId);
    const updated = await this.store.updateMemberRole(
      tenant,
      targetUserId,
      newRole,
      tenant.actorId,
      audit
        ? { requestId: audit.requestId, previousRole: existing?.role }
        : undefined,
    );
    await this.cacheHooks?.onMembershipChanged(tenant.workspaceId, targetUserId);
    return updated;
  }

  async removeMember(
    tenant: TenantContext,
    targetUserId: string,
    audit?: { requestId: string },
  ): Promise<void> {
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

    await this.store.removeMember(
      tenant,
      targetUserId,
      audit ? { requestId: audit.requestId, actorUserId: tenant.actorId } : undefined,
    );
    await this.cacheHooks?.onMembershipChanged(tenant.workspaceId, targetUserId);
  }

  async transferOwnership(
    tenant: TenantContext,
    newOwnerUserId: string,
    audit?: { requestId: string },
  ): Promise<{ previousOwner: WorkspaceMembership; newOwner: WorkspaceMembership }> {
    const callerMembership = await this.store.getMembership(tenant, tenant.actorId);
    if (!callerMembership || callerMembership.role !== "owner") {
      throw new AppError({
        code: ErrorCode.FORBIDDEN,
        message: "Only workspace owners can transfer ownership",
      });
    }

    const result = await this.store.transferOwnership(tenant, newOwnerUserId, tenant.actorId, audit);
    await Promise.all([
      this.cacheHooks?.onMembershipChanged(tenant.workspaceId, tenant.actorId),
      this.cacheHooks?.onMembershipChanged(tenant.workspaceId, newOwnerUserId),
    ]);
    return result;
  }

  async createInvite(
    tenant: TenantContext,
    email: string,
    role: WorkspaceRole,
    appUrl = "http://localhost:3015",
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

    const inviteUrl = `${appUrl}/accept-invitation?token=${rawToken}`;
    const delivery = await inviteEmailDelivery.sendWorkspaceInvite(email, inviteUrl, role);

    if (!delivery.delivered && process.env.NODE_ENV === "production") {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Email delivery adapter not configured in production",
      });
    }

    return { invite, rawToken };
  }

  async resendInvite(
    tenant: TenantContext,
    inviteId: string,
    appUrl = "http://localhost:3015",
  ): Promise<{ invite: WorkspaceInvite; rawToken: string }> {
    const rawToken = `wsi_${randomBytes(24).toString("hex")}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await this.store.resendInvite(tenant, inviteId, tokenHash, expiresAt);
    const inviteUrl = `${appUrl}/accept-invitation?token=${rawToken}`;
    const delivery = await inviteEmailDelivery.sendWorkspaceInvite(invite.email, inviteUrl, invite.role);

    if (!delivery.delivered && process.env.NODE_ENV === "production") {
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: "Email delivery adapter not configured in production",
      });
    }

    return { invite, rawToken };
  }

  async verifyInviteToken(rawToken: string): Promise<{
    valid: boolean;
    workspace?: { id: string; name: string; slug: string };
    email?: string;
    role?: string;
    expired?: boolean;
    accepted?: boolean;
    message?: string;
  }> {
    if (!rawToken || rawToken.trim().length === 0) {
      return { valid: false, message: "Token is required" };
    }

    const tokenHash = createHash("sha256").update(rawToken.trim()).digest("hex");
    const record = await this.store.findInviteByHash(tokenHash);

    if (!record) {
      return { valid: false, message: "Invalid invitation link" };
    }

    const { invite, workspace } = record;
    if (invite.acceptedAt) {
      return { valid: false, accepted: true, message: "Invitation has already been accepted" };
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      return { valid: false, expired: true, message: "Invitation has expired" };
    }

    return {
      valid: true,
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      email: invite.email,
      role: invite.role,
    };
  }

  async acceptInvite(
    rawToken: string,
    acceptingUser: { id: string; email: string },
    audit?: { requestId: string },
  ): Promise<{ workspace: { id: string; name: string }; membership: WorkspaceMembership; previousRole?: string }> {
    if (!rawToken || rawToken.trim().length === 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Token is required",
      });
    }

    const tokenHash = createHash("sha256").update(rawToken.trim()).digest("hex");
    const result = await this.store.acceptInvite(tokenHash, acceptingUser.id, acceptingUser.email, audit);

    await this.cacheHooks?.onMembershipChanged(result.workspace.id, acceptingUser.id);

    return {
      workspace: { id: result.workspace.id, name: result.workspace.name },
      membership: result.membership,
      previousRole: result.previousRole,
    };
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
