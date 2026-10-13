import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { RuntimeHttpContext } from "../context.js";

export const createInternalEvalRoutes: RouteModule<RuntimeHttpContext> = (ctx) => {
  const router = createServiceRouter();
  router.post(
    "/internal/v1/workspaces/:workspaceId/eval/turns",
    ctx.internalAuth,
    asyncHandler(ctx.evalTurnsCtrl.executeEvalTurn),
  );
  return router;
};
