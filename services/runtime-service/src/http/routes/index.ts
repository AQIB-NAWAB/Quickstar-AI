import { createServiceRouter, type Router } from "@quickstart/http-server";
import type { RuntimeHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createInternalWidgetRoutes } from "./internal-widget.routes.js";
import { createTurnsRoutes } from "./turns.routes.js";

export function createRuntimeApiRouter(ctx: RuntimeHttpContext): Router {
  const router = createServiceRouter();

  router.use(createHealthRoutes(ctx));
  router.use(createInternalWidgetRoutes(ctx));
  router.use(createTurnsRoutes(ctx));

  return router;
}
