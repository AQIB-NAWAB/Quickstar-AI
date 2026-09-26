import { roleHasPermission, type WorkspacePermission } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "../lib/workspace-access-client.js";

export function requireWorkspacePermission(
  client: WorkspaceAccessClient,
  permission: WorkspacePermission | string,
): RequestHandler {
  return async (req, res, next) => {
    const requestId = requestIdFromResponse(res);
    const tenant = res.locals.tenantContext;

    if (!tenant) {
      return next(
        new AppError({
          code: ErrorCode.INTERNAL,
          message: "Tenant context not initialized before permission evaluation",
          requestId,
        }),
      );
    }

    try {
      const role = await client.resolveRole(
        tenant.workspaceId,
        tenant.actorId,
        req.headers.authorization,
        requestId,
      );
      if (!roleHasPermission(role, permission)) {
        return next(
          new AppError({
            code: ErrorCode.FORBIDDEN,
            message: `Forbidden: Role '${role}' lacks permission '${permission}'`,
            requestId,
          }),
        );
      }
      res.locals.memberRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
}
