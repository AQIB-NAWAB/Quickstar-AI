import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";
import type { WorkspacePermission } from "../domain/permissions.js";
import type { AuthorizationService } from "../services/authorization.service.js";

export function requirePermission(
  authz: AuthorizationService,
  permission: WorkspacePermission | string,
): RequestHandler {
  return async (_req, res, next) => {
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
      const { role } = await authz.checkPermission(tenant.workspaceId, tenant.actorId, permission);
      res.locals.memberRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
}
