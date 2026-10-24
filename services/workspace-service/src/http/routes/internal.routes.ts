import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { WorkspaceHttpContext } from "../context.js";

export const createInternalRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  router.post(
    "/internal/publishable-keys/resolve",
    ctx.internalAuth,
    asyncHandler(ctx.publishableKeysCtrl.resolveInternal),
  );
  router.post(
    "/internal/workspaces/:workspaceId/integrations/google_calendar/actions",
    ctx.internalAuth,
    asyncHandler(ctx.integrationsCtrl.calendarAction),
  );
  router.post(
    "/internal/workspaces/:workspaceId/integrations/:provider/actions",
    ctx.internalAuth,
    asyncHandler(ctx.integrationsCtrl.integrationAction),
  );
  return router;
};
