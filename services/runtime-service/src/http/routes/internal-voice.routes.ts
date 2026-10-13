import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import type { RuntimeHttpContext } from "../context.js";

export const createInternalVoiceRoutes: RouteModule<RuntimeHttpContext> = (ctx) => {
  const router = createServiceRouter();
  router.post(
    "/internal/workspaces/:workspaceId/voice/conversations/:conversationId/turns",
    ctx.internalAuth,
    asyncHandler(ctx.voiceTurnsCtrl.executeVoiceTurn),
  );
  return router;
};
