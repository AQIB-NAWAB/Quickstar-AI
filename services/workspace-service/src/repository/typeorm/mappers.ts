import type { Workspace, WorkspaceMembership, WorkspaceInvite } from "../../domain/types.js";
import type {
  WorkspaceEntity,
  WorkspaceMembershipEntity,
  WorkspaceInviteEntity,
} from "../entities/index.js";

export function toWorkspace(entity: WorkspaceEntity): Workspace {
  return {
    id: entity.id,
    orgId: entity.orgId,
    name: entity.name,
    slug: entity.slug,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toWorkspaceMembership(entity: WorkspaceMembershipEntity): WorkspaceMembership {
  return {
    id: entity.id,
    workspaceId: entity.workspaceId,
    userId: entity.userId,
    role: entity.role,
    roleUpdatedAt: entity.roleUpdatedAt,
    roleUpdatedBy: entity.roleUpdatedBy,
    createdAt: entity.createdAt,
  };
}

export function toWorkspaceInvite(entity: WorkspaceInviteEntity): WorkspaceInvite {
  return {
    id: entity.id,
    workspaceId: entity.workspaceId,
    email: entity.email,
    role: entity.role,
    tokenHash: entity.tokenHash,
    invitedBy: entity.invitedBy,
    expiresAt: entity.expiresAt,
    acceptedAt: entity.acceptedAt,
    acceptedBy: entity.acceptedBy,
    createdAt: entity.createdAt,
  };
}
