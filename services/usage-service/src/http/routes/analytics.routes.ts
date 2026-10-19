import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import {
  ANALYTICS_READ,
  createAnalyticsController,
} from "../../controllers/analytics.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { UsageHttpContext } from "../context.js";

export const createAnalyticsRoutes: RouteModule<UsageHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createAnalyticsController(ctx.analytics);
  const read = requireWorkspacePermission(ctx.workspaceAccess, ANALYTICS_READ);

  // Rollup endpoint
  router.get(
    "/v1/workspaces/:workspaceId/analytics",
    ctx.authGuard,
    ctx.tenantGuard,
    read,
    asyncHandler(ctrl.getAnalytics),
  );

  // Sub-resource endpoints
  router.get(
    "/v1/workspaces/:workspaceId/analytics/summary",
    ctx.authGuard,
    ctx.tenantGuard,
    read,
    asyncHandler(ctrl.getSummary),
  );

  router.get(
    "/v1/workspaces/:workspaceId/analytics/tokens",
    ctx.authGuard,
    ctx.tenantGuard,
    read,
    asyncHandler(ctrl.getTokens),
  );

  router.get(
    "/v1/workspaces/:workspaceId/analytics/latency",
    ctx.authGuard,
    ctx.tenantGuard,
    read,
    asyncHandler(ctrl.getLatency),
  );

  router.get(
    "/v1/workspaces/:workspaceId/analytics/usage",
    ctx.authGuard,
    ctx.tenantGuard,
    read,
    asyncHandler(ctrl.getUsage),
  );

  return router;
};
