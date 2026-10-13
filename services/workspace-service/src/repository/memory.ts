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
  }

  async deleteWorkspace(tenant: TenantContext): Promise<boolean> {
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
    const mem = this.memberships.get(`${tenant.workspaceId}:${targetUserId}`);
    if (!mem) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Workspace membership not found",
      });
    }

    mem.role = newRole;
    mem.roleUpdatedAt = new Date();
    mem.roleUpdatedBy = updatedByUserId;

    return mem;
  }

  async removeMember(tenant: TenantContext, targetUserId: string): Promise<boolean> {
    const key = `${tenant.workspaceId}:${targetUserId}`;
    return this.memberships.delete(key);
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
}
