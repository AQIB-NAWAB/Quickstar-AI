import type { WorkspaceRole } from "./permissions.js";

export type Workspace = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkspaceMembership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  roleUpdatedAt: Date;
  roleUpdatedBy: string | null;
  createdAt: Date;
};

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
};
