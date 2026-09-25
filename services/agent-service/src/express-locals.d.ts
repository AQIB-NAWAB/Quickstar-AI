import type { TenantContext } from "@quickstart/auth";
import type { WorkspaceRole } from "@quickstart/contracts";

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
