import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { RuntimeHttpContext } from "../context.js";

export const createTurnsRoutes: RouteModule<RuntimeHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, turnsCtrl } = ctx;

  router.post(
    "/v1/workspaces/:workspaceId/conversations/:conversationId/turns",
    ...tenantMiddleware,
    asyncHandler(turnsCtrl.executeTurn),
  );

  return router;
};
