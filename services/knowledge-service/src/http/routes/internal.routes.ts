import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createInternalController } from "../../controllers/internal.controller.js";
import type { KnowledgeHttpContext } from "../context.js";

export const createInternalRoutes: RouteModule<KnowledgeHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createInternalController(ctx.sources, ctx.retrieve);
  router.get(
    "/internal/workspaces/:workspaceId/knowledge/ready-count",
    ctx.internalAuth,
    asyncHandler(ctrl.readyCount),
  );
  router.post("/internal/retrieve", ctx.internalAuth, asyncHandler(ctrl.retrieve));
  return router;
};
