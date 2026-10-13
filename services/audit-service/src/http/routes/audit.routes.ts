import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { createAuditController, AUDIT_READ } from "../../controllers/audit.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { AuditHttpContext } from "../context.js";

export const createAuditRoutes: RouteModule<AuditHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createAuditController(ctx.audit);
  const read = requireWorkspacePermission(ctx.workspaceAccess, AUDIT_READ);

  router.get(
    "/v1/workspaces/:workspaceId/audit",
    ctx.authGuard,
    ctx.tenantGuard,
    read,
    asyncHandler(ctrl.list),
  );

  return router;
};
