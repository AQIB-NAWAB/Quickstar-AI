import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createHealthController } from "../../controllers/health.controller.js";
import type { VoiceHttpContext } from "../context.js";

export const createHealthRoutes: RouteModule<VoiceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const health = createHealthController(ctx.readinessProbes);
  router.get("/healthz", health.healthz);
  router.get("/health", health.healthz);
  router.get("/readyz", asyncHandler(health.readyz));
  return router;
};
