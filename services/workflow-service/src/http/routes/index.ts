import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { WorkflowHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createWorkflowsRoutes } from "./workflows.routes.js";

const workflowRouteModules = [createHealthRoutes, createWorkflowsRoutes] as const;

export function createWorkflowApiRouter(ctx: WorkflowHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, workflowRouteModules));
  return root;
}
