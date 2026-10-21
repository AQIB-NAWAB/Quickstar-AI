import { createApiRouter, type Router } from "@quickstart/http-server";
import type { WorkspaceHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createIntegrationsRoutes } from "./integrations.routes.js";
import { createNotificationsRoutes } from "./notifications.routes.js";
import { createWebhooksRoutes } from "./webhooks.routes.js";
import { createInternalRoutes } from "./internal.routes.js";
import { createOrgWorkspacesRoutes } from "./org-workspaces.routes.js";
import { createPublishableKeysRoutes } from "./publishable-keys.routes.js";
import { createWorkspaceTenantRoutes } from "./workspace-tenant.routes.js";

const workspaceRouteModules = [
  createHealthRoutes,
  createInternalRoutes,
  createOrgWorkspacesRoutes,
  createWorkspaceTenantRoutes,
  createPublishableKeysRoutes,
  createIntegrationsRoutes,
  createNotificationsRoutes,
  createWebhooksRoutes,
] as const;


export function createWorkspaceApiRouter(context: WorkspaceHttpContext): Router {
  return createApiRouter(context, workspaceRouteModules);
}
