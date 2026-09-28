import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import {
  createSourcesController,
  KNOWLEDGE_READ,
  KNOWLEDGE_WRITE,
} from "../../controllers/sources.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { KnowledgeHttpContext } from "../context.js";

export const createSourcesRoutes: RouteModule<KnowledgeHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createSourcesController(ctx.sources);
  const readPerm = requireWorkspacePermission(ctx.workspaceAccess, KNOWLEDGE_READ);
  const writePerm = requireWorkspacePermission(ctx.workspaceAccess, KNOWLEDGE_WRITE);
  const chain = [ctx.authGuard, ctx.tenantGuard];

  router.post(
    "/v1/workspaces/:workspaceId/knowledge/sources",
    ...chain,
    writePerm,
    asyncHandler(ctrl.create),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/knowledge/sources/:sourceId",
    ...chain,
    writePerm,
    asyncHandler(ctrl.update),
  );
  router.get(
    "/v1/workspaces/:workspaceId/knowledge/sources/:sourceId",
    ...chain,
    readPerm,
    asyncHandler(ctrl.get),
  );
  router.get(
    "/v1/workspaces/:workspaceId/knowledge/sources",
    ...chain,
    readPerm,
    asyncHandler(ctrl.list),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/knowledge/sources/:sourceId",
    ...chain,
    writePerm,
    asyncHandler(ctrl.delete),
  );
  return router;
};
