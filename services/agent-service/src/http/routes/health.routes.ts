import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { handleHealth, handleReady } from "../../controllers/health.controller.js";
import type { AgentHttpContext } from "../context.js";

export const SERVICE_NAME = "service-agent";

export const createHealthRoutes: RouteModule<AgentHttpContext> = (ctx) => {
  const router = createServiceRouter();
  router.get("/healthz", asyncHandler((_req, res) => handleHealth(res)));
  router.get("/health", asyncHandler((_req, res) => handleHealth(res)));
  router.get(
    "/readyz",
    asyncHandler(async (_req, res) => {
      await handleReady(res, ctx.readinessProbes);
    }),
  );
  return router;
};
