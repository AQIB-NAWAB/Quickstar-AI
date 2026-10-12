import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createVoiceProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.voiceUrl);
  router.all("/v1/workspaces/:workspaceId/voice/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/voice", ...chain);
  return router;
};
