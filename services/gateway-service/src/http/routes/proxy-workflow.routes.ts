import { createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createProtectedWorkspaceProxyChain } from "../../lib/protected-workspace-proxy.js";
import type { GatewayHttpContext } from "../context.js";

export const createWorkflowProxyRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const chain = createProtectedWorkspaceProxyChain(ctx, ctx.config.workflowUrl);
  router.all("/v1/workspaces/:workspaceId/workflows/*", ...chain);
  router.all("/v1/workspaces/:workspaceId/workflows", ...chain);
  return router;
};
