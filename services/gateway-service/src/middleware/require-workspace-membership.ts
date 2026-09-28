import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";
import type { WorkspaceAccessClient } from "@quickstart/workspace-access";

export function createRequireWorkspaceMembershipMiddleware(
  workspaceAccess: WorkspaceAccessClient,
): RequestHandler {
  return async (req, res, next) => {
    const requestId = requestIdFromResponse(res);
    const raw = req.params.workspaceId;
    const workspaceId = Array.isArray(raw) ? raw[0] : raw;
    const access = res.locals.accessToken;

    if (!workspaceId) {
      return next(
        new AppError({
          code: ErrorCode.INTERNAL,
          message: "Workspace membership check requires :workspaceId route param",
          requestId,
        }),
      );
    }

    if (!access?.sub) {
      return next(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication required before workspace membership check",
          requestId,
        }),
      );
    }

    try {
      await workspaceAccess.resolveRole(
        workspaceId,
        access.sub,
        req.headers.authorization,
        requestId,
      );
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
