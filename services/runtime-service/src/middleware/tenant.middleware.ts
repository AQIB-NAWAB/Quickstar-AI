import type { TenantContext } from "@quickstart/auth";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, type RequestHandler } from "@quickstart/http-server";

function extractRouteParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0];
  return val ?? "";
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireTenantContext(): RequestHandler {
  return (req, res, next) => {
    const requestId = requestIdFromResponse(res);
    const workspaceId = extractRouteParam(req.params.workspaceId);
    const actorId = res.locals.actorUserId ?? "authenticated-actor";

    if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
      return next(
        new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Valid workspace UUID parameter is required",
          requestId,
        }),
      );
    }

    const tenantContext: TenantContext = {
      workspaceId,
      actorId,
    };

    res.locals.tenantContext = tenantContext;
    next();
  };
}
