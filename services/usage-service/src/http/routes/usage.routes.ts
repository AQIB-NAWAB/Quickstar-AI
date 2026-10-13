import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createUsageController, USAGE_READ } from "../../controllers/usage.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { UsageHttpContext } from "../context.js";

export const createUsageRoutes: RouteModule<UsageHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createUsageController(ctx.usage);
  const read = requireWorkspacePermission(ctx.workspaceAccess, USAGE_READ);

  router.post("/internal/v1/usage/ingest", ctx.internalAuth, asyncHandler(ctrl.ingest));

  router.get(
    "/v1/workspaces/:workspaceId/usage",
    ctx.authGuard,
    ctx.tenantGuard,
    read,
    asyncHandler(ctrl.list),
  );

  return router;
};
