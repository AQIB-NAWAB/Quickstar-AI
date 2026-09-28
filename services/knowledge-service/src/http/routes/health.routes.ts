import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createHealthController } from "../../controllers/health.controller.js";
import type { KnowledgeHttpContext } from "../context.js";

export const createHealthRoutes: RouteModule<KnowledgeHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const health = createHealthController(ctx.readinessProbes);
  router.get("/healthz", asyncHandler(health.healthz));
  router.get("/readyz", asyncHandler(health.readyz));
  return router;
};
