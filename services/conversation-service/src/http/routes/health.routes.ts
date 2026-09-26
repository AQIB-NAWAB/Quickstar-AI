import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { handleHealth, handleReady } from "../../controllers/health.controller.js";
import type { ConversationHttpContext } from "../context.js";

export const createHealthRoutes: RouteModule<ConversationHttpContext> = (ctx) => {
  const router = createServiceRouter();

  router.get("/healthz", (_req, res) => handleHealth(res));
  router.get("/health", (_req, res) => handleHealth(res));
  router.get(
    "/readyz",
    asyncHandler(async (_req, res) => {
      await handleReady(res, ctx.readinessProbes);
    }),
  );

  return router;
};
