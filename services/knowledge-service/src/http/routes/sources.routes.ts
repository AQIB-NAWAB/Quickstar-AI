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

  // Upload multipart file
  router.post(
    "/v1/workspaces/:workspaceId/knowledge/sources/upload",
    ...chain,
    writePerm,
    asyncHandler(ctrl.upload),
  );

  // Create text or URL source
  router.post(
    "/v1/workspaces/:workspaceId/knowledge/sources",
    ...chain,
    writePerm,
    asyncHandler(ctrl.create),
  );

  // List persisted chunks for inspector
  router.get(
    "/v1/workspaces/:workspaceId/knowledge/sources/:sourceId/chunks",
    ...chain,
    readPerm,
    asyncHandler(ctrl.listChunks),
  );

  // Get details of single source
  router.get(
    "/v1/workspaces/:workspaceId/knowledge/sources/:sourceId",
    ...chain,
    readPerm,
    asyncHandler(ctrl.get),
  );

  // List sources with filters, search, and pagination
  router.get(
    "/v1/workspaces/:workspaceId/knowledge/sources",
    ...chain,
    readPerm,
    asyncHandler(ctrl.list),
  );

  // Update source
  router.patch(
    "/v1/workspaces/:workspaceId/knowledge/sources/:sourceId",
    ...chain,
    writePerm,
    asyncHandler(ctrl.update),
  );

  // Delete source
  router.delete(
    "/v1/workspaces/:workspaceId/knowledge/sources/:sourceId",
    ...chain,
    writePerm,
    asyncHandler(ctrl.delete),
  );

  return router;
};
