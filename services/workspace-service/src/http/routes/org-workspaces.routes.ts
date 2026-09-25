import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { WorkspaceHttpContext } from "../context.js";

/**
 * Organization-scoped workspace listing and creation. Tenant context is not required yet;
 * authorization is org membership via the access token.
 */
export const createOrgWorkspacesRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { authGuard, workspacesCtrl } = ctx;

  router.post(
    "/v1/orgs/:orgId/workspaces",
    authGuard,
    asyncHandler(workspacesCtrl.createWorkspace),
  );
  router.get(
    "/v1/orgs/:orgId/workspaces",
    authGuard,
    asyncHandler(workspacesCtrl.listWorkspacesByOrg),
  );

  return router;
};
