import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { AgentHttpContext } from "../context.js";

export const createAgentsRoutes: RouteModule<AgentHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, workspaceAccess, agentsCtrl } = ctx;
  const chain = tenantMiddleware;

  router.post(
    "/v1/workspaces/:workspaceId/agents",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_CREATE),
    asyncHandler(agentsCtrl.createAgent),
  );
  router.get(
    "/v1/workspaces/:workspaceId/agents",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_READ),
    asyncHandler(agentsCtrl.listAgents),
  );
  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_READ),
    asyncHandler(agentsCtrl.getAgent),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/agents/:agentId",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_UPDATE),
    asyncHandler(agentsCtrl.updateAgent),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/agents/:agentId",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_DELETE),
    asyncHandler(agentsCtrl.deleteAgent),
  );

  router.post(
    "/v1/workspaces/:workspaceId/agents/:agentId/publish",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_PUBLISH),
    asyncHandler(agentsCtrl.publishAgent),
  );

  router.post(
    "/v1/workspaces/:workspaceId/agents/:agentId/rollback",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_PUBLISH),
    asyncHandler(agentsCtrl.rollbackAgent),
  );

  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/versions",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_READ),
    asyncHandler(agentsCtrl.listVersions),
  );

  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/versions/:leftId/diff/:rightId",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_READ),
    asyncHandler(agentsCtrl.diffVersions),
  );

  router.get(
    "/v1/workspaces/:workspaceId/agents/:agentId/versions/:versionId",
    ...chain,
    requireWorkspacePermission(workspaceAccess, WORKSPACE_PERMISSIONS.AGENT_READ),
    asyncHandler(agentsCtrl.getVersion),
  );

  return router;
};
