import { createApiRouter, type Router } from "@quickstart/http-server";
import type { WorkspaceHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createOrgWorkspacesRoutes } from "./org-workspaces.routes.js";
import { createWorkspaceTenantRoutes } from "./workspace-tenant.routes.js";

const workspaceRouteModules = [
  createHealthRoutes,
  createOrgWorkspacesRoutes,
  createWorkspaceTenantRoutes,
] as const;

export function createWorkspaceApiRouter(context: WorkspaceHttpContext): Router {
  return createApiRouter(context, workspaceRouteModules);
}
