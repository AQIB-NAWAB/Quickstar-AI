import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { WorkspacesService } from "../services/workspaces.service.js";
import { routeParam } from "../utils/route-param.js";

export function createWorkspacesController(workspaces: WorkspacesService) {
  return {
    createWorkspace: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const actorUserId = res.locals.actorUserId;
      const orgId = routeParam(req.params.orgId);

      if (!actorUserId) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Actor context required",
          requestId,
        });
      }

      const body = req.body as { name?: string; slug?: string };
      const workspace = await workspaces.createWorkspace({
        orgId,
        name: body?.name ?? "",
        slug: body?.slug ?? "",
        ownerUserId: actorUserId,
      });

      sendPlatformJson(res, 201, {
        request_id: requestId,
        workspace,
      });
    }) as RequestHandler,

    listWorkspacesByOrg: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const actorUserId = res.locals.actorUserId;
      const orgId = routeParam(req.params.orgId);

      if (!actorUserId) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Actor context required",
          requestId,
        });
      }

      const list = await workspaces.listWorkspacesByOrg(orgId, actorUserId);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        workspaces: list,
      });
    }) as RequestHandler,

    getWorkspace: (async (_req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;

      const workspace = await workspaces.getWorkspace(tenant);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        workspace,
      });
    }) as RequestHandler,

    updateWorkspace: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as { name?: string; slug?: string };

      const workspace = await workspaces.updateWorkspace(tenant, body);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        workspace,
      });
    }) as RequestHandler,

    deleteWorkspace: (async (_req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;

      await workspaces.deleteWorkspace(tenant);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        deleted: true,
      });
    }) as RequestHandler,
  };
}
