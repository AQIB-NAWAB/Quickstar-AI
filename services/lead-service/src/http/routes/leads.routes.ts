import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import {
  LEAD_CREATE,
  LEAD_EDIT,
  LEAD_READ,
  createLeadsController,
} from "../../controllers/leads.controller.js";
import { requireWorkspacePermission } from "../../middleware/require-workspace-permission.middleware.js";
import type { LeadHttpContext } from "../context.js";

export const createLeadsRoutes: RouteModule<LeadHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const ctrl = createLeadsController(ctx.leads);
  const chain = [ctx.authGuard, ctx.tenantGuard];
  const read = requireWorkspacePermission(ctx.workspaceAccess, LEAD_READ);
  const create = requireWorkspacePermission(ctx.workspaceAccess, LEAD_CREATE);
  const edit = requireWorkspacePermission(ctx.workspaceAccess, LEAD_EDIT);

  // Schema routes before :leadId so "schema" is not captured as an id.
  router.get(
    "/v1/workspaces/:workspaceId/leads/schema",
    ...chain,
    read,
    asyncHandler(ctrl.getSchema),
  );
  router.put(
    "/v1/workspaces/:workspaceId/leads/schema",
    ...chain,
    edit,
    asyncHandler(ctrl.putSchema),
  );

  router.get("/v1/workspaces/:workspaceId/leads", ...chain, read, asyncHandler(ctrl.list));
  router.post("/v1/workspaces/:workspaceId/leads", ...chain, create, asyncHandler(ctrl.create));
  router.get(
    "/v1/workspaces/:workspaceId/leads/:leadId",
    ...chain,
    read,
    asyncHandler(ctrl.get),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/leads/:leadId",
    ...chain,
    edit,
    asyncHandler(ctrl.update),
  );
  router.post(
    "/v1/workspaces/:workspaceId/leads/:leadId/status",
    ...chain,
    edit,
    asyncHandler(ctrl.updateStatus),
  );

  // Moaz lead-gen bot → durable store (no staff JWT; internal token only)
  router.post(
    "/internal/v1/workspaces/:workspaceId/leads/upsert",
    ctx.internalAuth,
    asyncHandler(ctrl.internalUpsert),
  );

  return router;
};
