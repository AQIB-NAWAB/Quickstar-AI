import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import {
  roleHasPermission,
  type WorkspacePermission,
  type WorkspaceRole,
} from "../domain/permissions.js";
import type { WorkspaceMembership } from "../domain/types.js";
import type { WorkspaceStore } from "../repository/types.js";

export class AuthorizationService {
  constructor(private readonly store: WorkspaceStore) {}

  async getMembership(workspaceId: string, userId: string): Promise<WorkspaceMembership | null> {
    const tenant: TenantContext = { workspaceId, actorId: userId };
    return this.store.getMembership(tenant, userId);
  }

  async checkPermission(
    workspaceId: string,
    userId: string,
    permission: WorkspacePermission | string,
  ): Promise<{ role: WorkspaceRole }> {
    const membership = await this.getMembership(workspaceId, userId);
    if (!membership) {
      throw new AppError({
        code: ErrorCode.FORBIDDEN,
        message: "Access denied: Not a member of this workspace",
      });
    }

    const has = roleHasPermission(membership.role, permission);
    if (!has) {
      throw new AppError({
        code: ErrorCode.FORBIDDEN,
        message: `Forbidden: Role '${membership.role}' lacks permission '${permission}'`,
      });
    }

    return { role: membership.role };
  }
}
