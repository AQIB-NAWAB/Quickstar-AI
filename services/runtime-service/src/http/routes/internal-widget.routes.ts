import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { RuntimeHttpContext } from "../context.js";

export const createInternalWidgetRoutes: RouteModule<RuntimeHttpContext> = (ctx) => {
  const router = createServiceRouter();
  router.post(
    "/internal/workspaces/:workspaceId/widget/conversations/:conversationId/turns",
    ctx.internalAuth,
    asyncHandler(ctx.widgetTurnsCtrl.executeWidgetTurn),
  );
  return router;
};
