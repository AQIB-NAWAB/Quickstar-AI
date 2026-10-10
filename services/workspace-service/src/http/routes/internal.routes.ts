import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { WorkspaceHttpContext } from "../context.js";

export const createInternalRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  router.post(
    "/internal/publishable-keys/resolve",
    ctx.internalAuth,
    asyncHandler(ctx.publishableKeysCtrl.resolveInternal),
  );
  return router;
};
