import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { AuditHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createAuditRoutes } from "./audit.routes.js";

const auditRouteModules = [createHealthRoutes, createAuditRoutes] as const;

export function createAuditApiRouter(ctx: AuditHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, auditRouteModules));
  return root;
}
