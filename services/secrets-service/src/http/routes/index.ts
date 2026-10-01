import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { SecretsHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createSecretsRoutes } from "./secrets.routes.js";
import { createInternalRoutes } from "./internal.routes.js";

const secretsRouteModules = [
  createHealthRoutes,
  createSecretsRoutes,
  createInternalRoutes,
] as const;

export function createSecretsApiRouter(ctx: SecretsHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, secretsRouteModules));
  return root;
}
