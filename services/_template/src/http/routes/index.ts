import { createApiRouter, type Router } from "@quickstart/http-server";
import type { TemplateHttpContext } from "../context.js";
import { createDemoRoutes } from "./demo.routes.js";
import { createHealthRoutes } from "./health.routes.js";

const templateRouteModules = [createHealthRoutes, createDemoRoutes] as const;

export function createTemplateApiRouter(context: TemplateHttpContext): Router {
  return createApiRouter(context, templateRouteModules);
}
