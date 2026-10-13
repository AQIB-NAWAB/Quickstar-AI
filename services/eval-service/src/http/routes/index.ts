import { createApiRouter, createServiceRouter, type Router } from "@quickstart/http-server";
import type { EvalHttpContext } from "../context.js";
import { createEvalRoutes } from "./eval.routes.js";
import { createHealthRoutes } from "./health.routes.js";

const evalRouteModules = [createHealthRoutes, createEvalRoutes] as const;

export function createEvalApiRouter(ctx: EvalHttpContext): Router {
  const root = createServiceRouter();
  root.use(createApiRouter(ctx, evalRouteModules));
  return root;
}
