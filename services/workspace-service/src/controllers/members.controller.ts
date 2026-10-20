import { AppError, ErrorCode } from "@quickstart/errors";
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

      const member = await members.updateMemberRole(tenant, targetUserId, body.role, {
        requestId,
      });
      sendPlatformJson(res, 200, {
        request_id: requestId,
        member,
      });
    }) as RequestHandler,

    removeMember: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const targetUserId = routeParam(req.params.userId);

      await members.removeMember(tenant, targetUserId, { requestId });
      sendPlatformJson(res, 200, {
        request_id: requestId,
        removed: true,
      });
    }) as RequestHandler,

    transferOwnership: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as { newOwnerUserId: string };

      const result = await members.transferOwnership(tenant, body.newOwnerUserId, {
        requestId,
      });
      sendPlatformJson(res, 200, {
        request_id: requestId,
        previous_owner: result.previousOwner,
        new_owner: result.newOwner,
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

    resendInvite: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const inviteId = routeParam(req.params.inviteId);

      const result = await members.resendInvite(tenant, inviteId);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        invite: result.invite,
        raw_token: result.rawToken,
      });
    }) as RequestHandler,

    verifyInvite: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const token = typeof req.query.token === "string" ? req.query.token : "";

      const result = await members.verifyInviteToken(token);
      sendPlatformJson(res, result.valid ? 200 : 400, {
        request_id: requestId,
        ...result,
      });
    }) as RequestHandler,

    acceptInvite: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const body = req.body as { token: string };
      const actorId = res.locals.actorUserId || res.locals.accessToken?.sub || res.locals.tenantContext?.actorId;
      const actorEmail = res.locals.actorEmail || res.locals.accessToken?.email;

      if (!actorId || !actorEmail) {
        throw new AppError({
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication with verified email required to accept invitation",
        });
      }

      const result = await members.acceptInvite(body.token, { id: actorId, email: actorEmail }, { requestId });
      sendPlatformJson(res, 200, {
        request_id: requestId,
        workspace: result.workspace,
        membership: result.membership,
        previous_role: result.previousRole,
      });
    }) as RequestHandler,
  };
}
