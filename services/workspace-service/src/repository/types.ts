import type { TenantContext } from "@quickstart/auth";
import type { Workspace, WorkspaceMembership, WorkspaceInvite } from "../domain/types.js";
import type { WorkspaceRole } from "../domain/permissions.js";

export type CreateWorkspaceInput = {
  orgId: string;
  name: string;
  slug: string;
  ownerUserId: string;
};

export type UpdateWorkspaceInput = {
  name?: string;
  slug?: string;
};

export type CreateInviteInput = {
  email: string;
  role: WorkspaceRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
};

export interface WorkspaceStore {
  /**
   * Create a workspace and automatically establish the creator as the first Owner.
   */
  createWorkspace(input: CreateWorkspaceInput): Promise<{ workspace: Workspace; membership: WorkspaceMembership }>;

  /**
   * List workspaces in an organization where the actor is a member.
   */
  listWorkspacesByOrg(orgId: string, actorUserId: string): Promise<Workspace[]>;

  /**
   * Operational queries: EVERY method mandates TenantContext to enforce tenant isolation.
   */
  getWorkspace(tenant: TenantContext): Promise<Workspace | null>;
  updateWorkspace(tenant: TenantContext, input: UpdateWorkspaceInput): Promise<Workspace>;
  deleteWorkspace(tenant: TenantContext): Promise<boolean>;

  listMembers(tenant: TenantContext): Promise<WorkspaceMembership[]>;
  getMembership(tenant: TenantContext, targetUserId: string): Promise<WorkspaceMembership | null>;
  updateMemberRole(
    tenant: TenantContext,
    targetUserId: string,
    newRole: WorkspaceRole,
    updatedByUserId: string,
    audit?: { requestId: string; previousRole?: WorkspaceRole },
  ): Promise<WorkspaceMembership>;
  removeMember(tenant: TenantContext, targetUserId: string): Promise<boolean>;

  createInvite(tenant: TenantContext, input: CreateInviteInput): Promise<WorkspaceInvite>;
  listInvites(tenant: TenantContext): Promise<WorkspaceInvite[]>;
  deleteInvite(tenant: TenantContext, inviteId: string): Promise<boolean>;
}
