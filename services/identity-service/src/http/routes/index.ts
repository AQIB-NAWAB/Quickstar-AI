import { createApiRouter, type Router } from "@quickstart/http-server";
import type { IdentityHttpContext } from "../context.js";
import { createApiKeysRoutes } from "./api-keys.routes.js";
import { createAuthRoutes } from "./auth.routes.js";
import { createHealthRoutes } from "./health.routes.js";
import { createOrganizationsRoutes } from "./organizations.routes.js";
import { createUsersRoutes } from "./users.routes.js";

const identityRouteModules = [
  createHealthRoutes,
  createAuthRoutes,
  createUsersRoutes,
  createOrganizationsRoutes,
  createApiKeysRoutes,
] as const;

export function createIdentityApiRouter(context: IdentityHttpContext): Router {
  return createApiRouter(context, identityRouteModules);
}
