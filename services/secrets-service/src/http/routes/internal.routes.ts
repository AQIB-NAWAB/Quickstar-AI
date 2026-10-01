import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createInternalSecretsController } from "../../controllers/secrets.controller.js";
import type { SecretsHttpContext } from "../context.js";

export const createInternalRoutes: RouteModule<SecretsHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createInternalSecretsController(ctx.secrets);

  // Internal-only: returns plaintext value. Guarded by internal bearer token only.
  router.get(
    "/internal/workspaces/:workspaceId/secrets/:name/value",
    ctx.internalAuth,
    asyncHandler(ctrl.reveal),
  );

  return router;
};
