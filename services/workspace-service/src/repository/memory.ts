import { randomUUID } from "node:crypto";
import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { WorkspaceRole } from "../domain/permissions.js";
import type { Workspace, WorkspaceMembership, WorkspaceInvite } from "../domain/types.js";
import type {
  WorkspaceStore,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  CreateInviteInput,
} from "./types.js";

export class MemoryWorkspaceStore implements WorkspaceStore {
  private workspaces = new Map<string, Workspace>();
  private memberships = new Map<string, WorkspaceMembership>();
  private invites = new Map<string, WorkspaceInvite>();
  private locks = new Map<string, Promise<unknown>>();

  private async withLock<T>(workspaceId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(workspaceId) ?? Promise.resolve();
    let release: () => void = () => {};
    const next = new Promise<void>((res) => {
      release = res;
    });
    this.locks.set(workspaceId, next);
    await prev;
    try {
      return await fn();
    } finally {
      if (this.locks.get(workspaceId) === next) {
        this.locks.delete(workspaceId);
      }
      release();
    }
  }

  addMemberForTesting(workspaceId: string, userId: string, role: WorkspaceRole): WorkspaceMembership {
    const mem: WorkspaceMembership = {
      id: randomUUID(),
      workspaceId,
      userId,
      role,
      roleUpdatedAt: new Date(),
      roleUpdatedBy: null,
      createdAt: new Date(),
    };
    this.memberships.set(`${workspaceId}:${userId}`, mem);
    return mem;
  }

  async createWorkspace(input: CreateWorkspaceInput): Promise<{
    workspace: Workspace;
    membership: WorkspaceMembership;
  }> {
    // Check (orgId, slug) uniqueness
    for (const w of this.workspaces.values()) {
      if (w.orgId === input.orgId && w.slug === input.slug) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: `Workspace slug '${input.slug}' already exists in this organization`,
        });
      }
    }

    const now = new Date();
    const workspaceId = randomUUID();
    const workspace: Workspace = {
      id: workspaceId,
      orgId: input.orgId,
      name: input.name,
      slug: input.slug,
      createdAt: now,
      updatedAt: now,
    };

    const membership: WorkspaceMembership = {
      id: randomUUID(),
      workspaceId,
      userId: input.ownerUserId,
      role: "owner",
      roleUpdatedAt: now,
      roleUpdatedBy: null,
      createdAt: now,
    };

    this.workspaces.set(workspaceId, workspace);
    this.memberships.set(`${workspaceId}:${input.ownerUserId}`, membership);

    return { workspace, membership };
  }

  async listWorkspacesByOrg(orgId: string, actorUserId: string): Promise<Workspace[]> {
    const result: Workspace[] = [];
    for (const workspace of this.workspaces.values()) {
      if (workspace.orgId === orgId) {
        const mem = this.memberships.get(`${workspace.id}:${actorUserId}`);
        if (mem) {
          result.push(workspace);
        }
      }
    }
    return result;
  }

  async getWorkspace(tenant: TenantContext): Promise<Workspace | null> {
    const ws = this.workspaces.get(tenant.workspaceId);
    return ws ?? null;
  }

  async updateWorkspace(tenant: TenantContext, input: UpdateWorkspaceInput): Promise<Workspace> {
    return this.withLock(tenant.workspaceId, async () => {
      const ws = this.workspaces.get(tenant.workspaceId);
      if (!ws) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Workspace not found",
        });
      }

      if (input.slug && input.slug !== ws.slug) {
        for (const w of this.workspaces.values()) {
          if (w.id !== ws.id && w.orgId === ws.orgId && w.slug === input.slug) {
            throw new AppError({
              code: ErrorCode.CONFLICT,
              message: `Workspace slug '${input.slug}' already exists in this organization`,
            });
          }
        }
        ws.slug = input.slug;
      }

      if (input.name) {
        ws.name = input.name;
      }

      ws.updatedAt = new Date();
      return ws;
    });
  }

  async deleteWorkspace(tenant: TenantContext): Promise<boolean> {
    return this.withLock(tenant.workspaceId, async () => {
      const exists = this.workspaces.has(tenant.workspaceId);
      if (!exists) {
        return false;
      }

      this.workspaces.delete(tenant.workspaceId);

      // Cascade delete memberships
      for (const [key, mem] of this.memberships.entries()) {
        if (mem.workspaceId === tenant.workspaceId) {
          this.memberships.delete(key);
        }
      }

      // Cascade delete invites
      for (const [key, inv] of this.invites.entries()) {
        if (inv.workspaceId === tenant.workspaceId) {
          this.invites.delete(key);
        }
      }

      return true;
    });
  }

  async listMembers(tenant: TenantContext): Promise<WorkspaceMembership[]> {
    const result: WorkspaceMembership[] = [];
    for (const mem of this.memberships.values()) {
      if (mem.workspaceId === tenant.workspaceId) {
        result.push(mem);
      }
    }
    return result;
  }

  async getMembership(tenant: TenantContext, targetUserId: string): Promise<WorkspaceMembership | null> {
    const mem = this.memberships.get(`${tenant.workspaceId}:${targetUserId}`);
    return mem ?? null;
  }

  async updateMemberRole(
    tenant: TenantContext,
    targetUserId: string,
    newRole: WorkspaceRole,
    updatedByUserId: string,
    _audit?: { requestId: string; previousRole?: WorkspaceRole },
  ): Promise<WorkspaceMembership> {
    return this.withLock(tenant.workspaceId, async () => {
      const mem = this.memberships.get(`${tenant.workspaceId}:${targetUserId}`);
      if (!mem) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Workspace membership not found",
        });
      }

      // Transactional Last-Owner Protection on demotion
      if (mem.role === "owner" && newRole !== "owner") {
        let ownerCount = 0;
        for (const m of this.memberships.values()) {
          if (m.workspaceId === tenant.workspaceId && m.role === "owner") {
            ownerCount++;
          }
        }
        if (ownerCount <= 1) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: "Cannot demote the only workspace owner",
          });
        }
      }

      mem.role = newRole;
      mem.roleUpdatedAt = new Date();
      mem.roleUpdatedBy = updatedByUserId;

      return mem;
    });
  }

  async removeMember(
    tenant: TenantContext,
    targetUserId: string,
    _audit?: { requestId: string; actorUserId: string },
  ): Promise<boolean> {
    return this.withLock(tenant.workspaceId, async () => {
      const key = `${tenant.workspaceId}:${targetUserId}`;
      const mem = this.memberships.get(key);
      if (!mem) {
        return false;
      }

      // Transactional Last-Owner Protection on removal
      if (mem.role === "owner") {
        let ownerCount = 0;
        for (const m of this.memberships.values()) {
          if (m.workspaceId === tenant.workspaceId && m.role === "owner") {
            ownerCount++;
          }
        }
        if (ownerCount <= 1) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: "Cannot remove the only workspace owner",
          });
        }
      }

      return this.memberships.delete(key);
    });
  }

  async transferOwnership(
    tenant: TenantContext,
    newOwnerUserId: string,
    currentOwnerUserId: string,
    _audit?: { requestId: string },
  ): Promise<{ previousOwner: WorkspaceMembership; newOwner: WorkspaceMembership }> {
    return this.withLock(tenant.workspaceId, async () => {
      const targetKey = `${tenant.workspaceId}:${newOwnerUserId}`;
      const targetMem = this.memberships.get(targetKey);
      if (!targetMem) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Target user is not a member of this workspace",
        });
      }

      const currentKey = `${tenant.workspaceId}:${currentOwnerUserId}`;
      const currentMem = this.memberships.get(currentKey);
      if (!currentMem || currentMem.role !== "owner") {
        throw new AppError({
          code: ErrorCode.FORBIDDEN,
          message: "Only workspace owners can transfer ownership",
        });
      }

      const now = new Date();
      targetMem.role = "owner";
      targetMem.roleUpdatedAt = now;
      targetMem.roleUpdatedBy = currentOwnerUserId;

      currentMem.role = "admin";
      currentMem.roleUpdatedAt = now;
      currentMem.roleUpdatedBy = currentOwnerUserId;

      return {
        previousOwner: currentMem,
        newOwner: targetMem,
      };
    });
  }

  async createInvite(tenant: TenantContext, input: CreateInviteInput): Promise<WorkspaceInvite> {
    const id = randomUUID();
    const now = new Date();
    const invite: WorkspaceInvite = {
      id,
      workspaceId: tenant.workspaceId,
      email: input.email,
      role: input.role,
      tokenHash: input.tokenHash,
      invitedBy: input.invitedBy,
      expiresAt: input.expiresAt,
      createdAt: now,
    };
    this.invites.set(id, invite);
    return invite;
  }

  async listInvites(tenant: TenantContext): Promise<WorkspaceInvite[]> {
    const result: WorkspaceInvite[] = [];
    for (const inv of this.invites.values()) {
      if (inv.workspaceId === tenant.workspaceId) {
        result.push(inv);
      }
    }
    return result;
  }

  async deleteInvite(tenant: TenantContext, inviteId: string): Promise<boolean> {
    const inv = this.invites.get(inviteId);
    if (!inv || inv.workspaceId !== tenant.workspaceId) {
      return false;
    }
    return this.invites.delete(inviteId);
  }

  async getInviteById(tenant: TenantContext, inviteId: string): Promise<WorkspaceInvite | null> {
    const inv = this.invites.get(inviteId);
    if (!inv || inv.workspaceId !== tenant.workspaceId) {
      return null;
    }
    return inv;
  }

  async findInviteByHash(tokenHash: string): Promise<{ invite: WorkspaceInvite; workspace: Workspace } | null> {
    for (const inv of this.invites.values()) {
      if (inv.tokenHash === tokenHash) {
        const workspace = this.workspaces.get(inv.workspaceId);
        if (workspace) {
          return { invite: inv, workspace };
        }
      }
    }
    return null;
  }

  async resendInvite(
    tenant: TenantContext,
    inviteId: string,
    newTokenHash: string,
    newExpiresAt: Date,
  ): Promise<WorkspaceInvite> {
    return this.withLock(tenant.workspaceId, async () => {
      const inv = this.invites.get(inviteId);
      if (!inv || inv.workspaceId !== tenant.workspaceId) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Workspace invite not found",
        });
      }
      if (inv.acceptedAt) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: "Invitation has already been accepted",
        });
      }

      inv.tokenHash = newTokenHash;
      inv.expiresAt = newExpiresAt;
      return inv;
    });
  }

  async acceptInvite(
    tokenHash: string,
    acceptingUserId: string,
    acceptingEmail: string,
    _audit?: { requestId: string },
  ): Promise<{ workspace: Workspace; membership: WorkspaceMembership; previousRole?: string }> {
    let foundInvite: WorkspaceInvite | null = null;
    for (const inv of this.invites.values()) {
      if (inv.tokenHash === tokenHash) {
        foundInvite = inv;
        break;
      }
    }

    if (!foundInvite) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Invitation not found or invalid",
      });
    }

    const invite = foundInvite;
    return this.withLock(invite.workspaceId, async () => {
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

      const workspace = this.workspaces.get(invite.workspaceId);
      if (!workspace) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Workspace no longer exists",
        });
      }

      const memberKey = `${invite.workspaceId}:${acceptingUserId}`;
      const existingMembership = this.memberships.get(memberKey);

      let membership: WorkspaceMembership;
      let previousRole: string | undefined;

      if (existingMembership) {
        previousRole = existingMembership.role;
        if (existingMembership.role !== "owner") {
          existingMembership.role = invite.role;
          existingMembership.roleUpdatedAt = new Date();
          existingMembership.roleUpdatedBy = invite.invitedBy;
          membership = existingMembership;
        } else {
          membership = existingMembership;
        }
      } else {
        const now = new Date();
        membership = {
          id: randomUUID(),
          workspaceId: invite.workspaceId,
          userId: acceptingUserId,
          role: invite.role,
          roleUpdatedAt: now,
          roleUpdatedBy: invite.invitedBy,
          createdAt: now,
        };
        this.memberships.set(memberKey, membership);
      }

      invite.acceptedAt = new Date();
      invite.acceptedBy = acceptingUserId;

      return {
        workspace,
        membership,
        previousRole,
      };
    });
  }
}
