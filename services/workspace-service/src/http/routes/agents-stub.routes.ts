import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { WORKSPACE_PERMISSIONS } from "../../domain/permissions.js";
import { requirePermission } from "../../middleware/require-permission.middleware.js";
import type { WorkspaceHttpContext } from "../context.js";

/** RBAC verification stub until the agent service exists (Slot 07). */
export const createAgentsStubRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, authorization, agentsStubCtrl } = ctx;

  router.post(
    "/v1/workspaces/:workspaceId/agents/:agentId/publish",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.AGENT_PUBLISH),
    asyncHandler(agentsStubCtrl.publishAgent),
  );

  return router;
};
