import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import {
  createFactsController,
  MEMORY_READ,
  MEMORY_WRITE,
} from "../../controllers/facts.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { MemoryHttpContext } from "../context.js";

export const createFactsRoutes: RouteModule<MemoryHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createFactsController(ctx.facts);
  const readPerm = requireWorkspacePermission(ctx.workspaceAccess, MEMORY_READ);
  const writePerm = requireWorkspacePermission(ctx.workspaceAccess, MEMORY_WRITE);
  const chain = [ctx.authGuard, ctx.tenantGuard];

  router.get(
    "/v1/workspaces/:workspaceId/memory/facts",
    ...chain,
    readPerm,
    asyncHandler(ctrl.list),
  );
  router.post(
    "/v1/workspaces/:workspaceId/memory/facts",
    ...chain,
    writePerm,
    asyncHandler(ctrl.create),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/memory/facts/:factId",
    ...chain,
    writePerm,
    asyncHandler(ctrl.update),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/memory/facts/:factId",
    ...chain,
    writePerm,
    asyncHandler(ctrl.deleteOne),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/memory/facts",
    ...chain,
    writePerm,
    asyncHandler(ctrl.deleteBySubject),
  );
  return router;
};
