import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";
import { routeParam } from "../utils/route-param.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireTenantContext(): RequestHandler {
  return (req, res, next) => {
    const requestId = requestIdFromResponse(res);
    const workspaceId = routeParam(req.params.workspaceId);
    const actorId = res.locals.actorUserId;
    if (!actorId) {
      return next(
        new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Actor context missing",
          requestId,
        }),
      );
    }
    if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
      return next(
        new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Valid workspace UUID required",
          requestId,
        }),
      );
    }
    res.locals.tenantContext = { workspaceId, actorId } satisfies TenantContext;
    next();
  };
}
