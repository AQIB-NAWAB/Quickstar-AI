import type { WorkspaceRole } from "@/features/settings/lib/types";

export type WorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  orgId?: string;
  org_id?: string;
  role?: WorkspaceRole;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

export type OrganizationItem = {
  id: string;
  name: string;
};

export type CreateWorkspaceInput = {
  name: string;
  slug: string;
  orgId?: string;
};
