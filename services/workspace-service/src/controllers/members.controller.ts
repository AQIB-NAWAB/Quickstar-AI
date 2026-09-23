import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { WorkspaceRole } from "../domain/permissions.js";
import type { MembersService } from "../services/members.service.js";
import { routeParam } from "../utils/route-param.js";

export function createMembersController(members: MembersService) {
  return {
    listMembers: (async (_req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;

      const list = await members.listMembers(tenant);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        members: list,
      });
    }) as RequestHandler,

    getMember: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const targetUserId = routeParam(req.params.userId);

      const member = await members.getMember(tenant, targetUserId);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        member,
      });
    }) as RequestHandler,

    updateMemberRole: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const targetUserId = routeParam(req.params.userId);
      const body = req.body as { role: WorkspaceRole };

      const member = await members.updateMemberRole(tenant, targetUserId, body.role);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        member,
      });
    }) as RequestHandler,

    removeMember: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const targetUserId = routeParam(req.params.userId);

      await members.removeMember(tenant, targetUserId);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        removed: true,
      });
    }) as RequestHandler,

    createInvite: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as { email: string; role: WorkspaceRole };

      const result = await members.createInvite(tenant, body.email, body.role);
      sendPlatformJson(res, 201, {
        request_id: requestId,
        invite: result.invite,
        raw_token: result.rawToken,
      });
    }) as RequestHandler,

    listInvites: (async (_req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;

      const list = await members.listInvites(tenant);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        invites: list,
      });
    }) as RequestHandler,

    deleteInvite: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const inviteId = routeParam(req.params.inviteId);

      await members.deleteInvite(tenant, inviteId);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        deleted: true,
      });
    }) as RequestHandler,
  };
}
