import type { Logger } from "@quickstart/logging";
import {
  asyncHandler,
  createPlatformApp,
  type Application,
} from "@quickstart/http-server";
import { createAuthMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantContext } from "../middleware/tenant.middleware.js";
import { requirePermission } from "../middleware/require-permission.middleware.js";
import { WORKSPACE_PERMISSIONS } from "../domain/permissions.js";
import type { WorkspacesService } from "../services/workspaces.service.js";
import type { MembersService } from "../services/members.service.js";
import type { AuthorizationService } from "../services/authorization.service.js";
import { createWorkspacesController } from "./workspaces.controller.js";
import { createMembersController } from "./members.controller.js";
import { createAgentsStubController } from "./agents-stub.controller.js";
import { handleHealth, handleReady, type ReadinessProbe } from "./health.controller.js";

export { SERVICE_NAME } from "./health.controller.js";

export type WorkspaceServices = {
  workspaces: WorkspacesService;
  members: MembersService;
  authorization: AuthorizationService;
};

export type CreateWorkspaceHttpServerOptions = {
  logger: Logger;
  services: WorkspaceServices;
  jwtSecret: string;
  requestTimeoutMs?: number;
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  readinessProbes?: ReadinessProbe[];
};

export function createHttpServer(options: CreateWorkspaceHttpServerOptions): Application {
  const { logger, services, jwtSecret } = options;
  const authGuard = createAuthMiddleware(jwtSecret);
  const tenantGuard = requireTenantContext();
  const authz = services.authorization;

  const workspacesCtrl = createWorkspacesController(services.workspaces);
  const membersCtrl = createMembersController(services.members);
  const agentsStubCtrl = createAgentsStubController();

  return createPlatformApp({
    logger,
    requestTimeoutMs: options.requestTimeoutMs,
    globalRateLimit: {
      windowMs: options.rateLimitWindowMs ?? 60_000,
      max: options.rateLimitMax ?? 120,
      skipPaths: ["/healthz", "/health", "/readyz"],
    },
    registerRoutes: (router) => {
      const probes = options.readinessProbes ?? [];
      router.get("/healthz", (_req, res) => handleHealth(res));
      router.get("/health", (_req, res) => handleHealth(res));
      router.get(
        "/readyz",
        asyncHandler(async (_req, res) => {
          await handleReady(res, probes);
        }),
      );

      // Org-level workspace routes
      router.post(
        "/v1/orgs/:orgId/workspaces",
        authGuard,
        asyncHandler(workspacesCtrl.createWorkspace),
      );
      router.get(
        "/v1/orgs/:orgId/workspaces",
        authGuard,
        asyncHandler(workspacesCtrl.listWorkspacesByOrg),
      );

      // Workspace-scoped routes
      router.get(
        "/v1/workspaces/:workspaceId",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.WORKSPACE_READ),
        asyncHandler(workspacesCtrl.getWorkspace),
      );
      router.patch(
        "/v1/workspaces/:workspaceId",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.WORKSPACE_UPDATE),
        asyncHandler(workspacesCtrl.updateWorkspace),
      );
      router.delete(
        "/v1/workspaces/:workspaceId",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.WORKSPACE_DELETE),
        asyncHandler(workspacesCtrl.deleteWorkspace),
      );

      // Members management
      router.get(
        "/v1/workspaces/:workspaceId/members",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.WORKSPACE_READ),
        asyncHandler(membersCtrl.listMembers),
      );
      router.get(
        "/v1/workspaces/:workspaceId/members/:userId",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.WORKSPACE_READ),
        asyncHandler(membersCtrl.getMember),
      );
      router.patch(
        "/v1/workspaces/:workspaceId/members/:userId",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.MEMBER_UPDATE_ROLE),
        asyncHandler(membersCtrl.updateMemberRole),
      );
      router.delete(
        "/v1/workspaces/:workspaceId/members/:userId",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.MEMBER_REMOVE),
        asyncHandler(membersCtrl.removeMember),
      );

      // Invites management
      router.get(
        "/v1/workspaces/:workspaceId/invites",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.WORKSPACE_READ),
        asyncHandler(membersCtrl.listInvites),
      );
      router.post(
        "/v1/workspaces/:workspaceId/invites",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.MEMBER_INVITE),
        asyncHandler(membersCtrl.createInvite),
      );
      router.delete(
        "/v1/workspaces/:workspaceId/invites/:inviteId",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.MEMBER_REMOVE),
        asyncHandler(membersCtrl.deleteInvite),
      );

      // Agent publish verification endpoint (for testing RBAC enforcement)
      router.post(
        "/v1/workspaces/:workspaceId/agents/:agentId/publish",
        authGuard,
        tenantGuard,
        requirePermission(authz, WORKSPACE_PERMISSIONS.AGENT_PUBLISH),
        asyncHandler(agentsStubCtrl.publishAgent),
      );
    },
  });
}
