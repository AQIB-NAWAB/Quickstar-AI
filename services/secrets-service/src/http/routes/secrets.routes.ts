import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import {
  createSecretsController,
  SECRET_READ,
  SECRET_WRITE,
} from "../../controllers/secrets.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { SecretsHttpContext } from "../context.js";

export const createSecretsRoutes: RouteModule<SecretsHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createSecretsController(ctx.secrets);
  const readPerm = requireWorkspacePermission(ctx.workspaceAccess, SECRET_READ);
  const writePerm = requireWorkspacePermission(ctx.workspaceAccess, SECRET_WRITE);
  const chain = [ctx.authGuard, ctx.tenantGuard];

  // GET /v1/workspaces/:workspaceId/secrets — list names only
  router.get(
    "/v1/workspaces/:workspaceId/secrets",
    ...chain,
    readPerm,
    asyncHandler(ctrl.list),
  );

  // POST /v1/workspaces/:workspaceId/secrets — create or overwrite
  router.post(
    "/v1/workspaces/:workspaceId/secrets",
    ...chain,
    writePerm,
    asyncHandler(ctrl.create),
  );

  // PUT /v1/workspaces/:workspaceId/secrets/:name/rotate — re-encrypt with new key
  router.put(
    "/v1/workspaces/:workspaceId/secrets/:name/rotate",
    ...chain,
    writePerm,
    asyncHandler(ctrl.rotate),
  );

  // DELETE /v1/workspaces/:workspaceId/secrets/:name
  router.delete(
    "/v1/workspaces/:workspaceId/secrets/:name",
    ...chain,
    writePerm,
    asyncHandler(ctrl.deleteByName),
  );

  return router;
};
