import { createServiceRouter, type Router } from "@quickstart/http-server";
import type { RuntimeHttpContext } from "../context.js";
import { createHealthRoutes } from "./health.routes.js";
import { createInternalEvalRoutes } from "./internal-eval.routes.js";
import { createInternalVoiceRoutes } from "./internal-voice.routes.js";
import { createInternalWidgetRoutes } from "./internal-widget.routes.js";
import { createGraphTurnsRoutes } from "./graph-turns.routes.js";
import { createTurnsRoutes } from "./turns.routes.js";

export function createRuntimeApiRouter(ctx: RuntimeHttpContext): Router {
  const router = createServiceRouter();

  router.use(createHealthRoutes(ctx));
  router.use(createInternalWidgetRoutes(ctx));
  router.use(createInternalVoiceRoutes(ctx));
  router.use(createInternalEvalRoutes(ctx));
  router.use(createGraphTurnsRoutes(ctx));
  router.use(createTurnsRoutes(ctx));

  return router;
}
