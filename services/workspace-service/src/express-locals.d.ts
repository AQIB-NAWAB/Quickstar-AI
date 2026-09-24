import type { TenantContext } from "@quickstart/auth";
import type { WorkspaceRole } from "./domain/permissions.js";

declare global {
  namespace Express {
    interface Locals {
      actorUserId?: string;
      tenantContext?: TenantContext;
      memberRole?: WorkspaceRole;
    }
  }
}

export {};
