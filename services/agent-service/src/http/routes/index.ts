import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { AgentHttpContext } from "../context.js";
import { createAgentsRoutes } from "./agents.routes.js";
import { createHealthRoutes } from "./health.routes.js";

const agentRouteModules = [createHealthRoutes, createAgentsRoutes] as const;

export function createAgentApiRouter(context: AgentHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(context, agentRouteModules));
  return root;
}
