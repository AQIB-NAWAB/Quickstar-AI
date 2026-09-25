import { asyncHandler, createServiceRouter, type RouteModule } from "@quickstart/http-server";
import { WORKSPACE_PERMISSIONS } from "../../domain/permissions.js";
import { requirePermission } from "../../middleware/require-permission.middleware.js";
import type { WorkspaceHttpContext } from "../context.js";

/**
 * Workspace tenant boundary: every route requires auth, validated tenant context, and RBAC.
 */
export const createWorkspaceTenantRoutes: RouteModule<WorkspaceHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { tenantMiddleware, authorization, workspacesCtrl, membersCtrl } = ctx;

  router.get(
    "/v1/workspaces/:workspaceId",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.WORKSPACE_READ),
    asyncHandler(workspacesCtrl.getWorkspace),
  );
  router.patch(
    "/v1/workspaces/:workspaceId",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.WORKSPACE_UPDATE),
    asyncHandler(workspacesCtrl.updateWorkspace),
  );
  router.delete(
    "/v1/workspaces/:workspaceId",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.WORKSPACE_DELETE),
    asyncHandler(workspacesCtrl.deleteWorkspace),
  );

  router.get(
    "/v1/workspaces/:workspaceId/members",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.WORKSPACE_READ),
    asyncHandler(membersCtrl.listMembers),
  );
  router.get(
    "/v1/workspaces/:workspaceId/members/:userId",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.WORKSPACE_READ),
    asyncHandler(membersCtrl.getMember),
  );
  router.patch(
    "/v1/workspaces/:workspaceId/members/:userId",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.MEMBER_UPDATE_ROLE),
    asyncHandler(membersCtrl.updateMemberRole),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/members/:userId",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.MEMBER_REMOVE),
    asyncHandler(membersCtrl.removeMember),
  );

  router.get(
    "/v1/workspaces/:workspaceId/invites",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.WORKSPACE_READ),
    asyncHandler(membersCtrl.listInvites),
  );
  router.post(
    "/v1/workspaces/:workspaceId/invites",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.MEMBER_INVITE),
    asyncHandler(membersCtrl.createInvite),
  );
  router.delete(
    "/v1/workspaces/:workspaceId/invites/:inviteId",
    ...tenantMiddleware,
    requirePermission(authorization, WORKSPACE_PERMISSIONS.MEMBER_REMOVE),
    asyncHandler(membersCtrl.deleteInvite),
  );

  return router;
};
