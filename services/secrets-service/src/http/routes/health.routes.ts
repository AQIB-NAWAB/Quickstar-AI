import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createHealthController } from "../../controllers/health.controller.js";
import type { SecretsHttpContext } from "../context.js";

export const createHealthRoutes: RouteModule<SecretsHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createHealthController(ctx.readinessProbes);
  router.get("/healthz", asyncHandler(ctrl.healthz));
  router.get("/readyz", asyncHandler(ctrl.readyz));
  return router;
};
