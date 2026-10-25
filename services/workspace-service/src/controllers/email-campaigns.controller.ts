import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import { AppError, ErrorCode } from "@quickstart/errors";
import type {
  ConnectSmtpMailboxInput,
  CreateSmtpCampaignInput,
  EmailCampaignsService,
} from "../services/email-campaigns.service.js";
import { routeParam } from "../utils/route-param.js";

function getWorkspaceId(req: { params: Record<string, string | string[] | undefined> }): string {
  const wid = routeParam(req.params.workspaceId);
  if (!wid) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "workspaceId parameter is required",
    });
  }
  return wid;
}

function getCampaignId(req: { params: Record<string, string | string[] | undefined> }): string {
  const campaignId = routeParam(req.params.campaignId);
  if (!campaignId) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "campaignId parameter is required",
    });
  }
  return campaignId;
}

function getMailboxId(req: { params: Record<string, string | string[] | undefined> }): string {
  const mailboxId = routeParam(req.params.mailboxId);
  if (!mailboxId) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "mailboxId parameter is required",
    });
  }
  return mailboxId;
}

function actorId(locals: Record<string, unknown>): string | undefined {
  const tenantContext = locals.tenantContext as { actorId?: string } | undefined;
  return tenantContext?.actorId ?? (locals.actorUserId as string | undefined);
}

export function createEmailCampaignsController(service: EmailCampaignsService) {
  return {
    listMailboxes: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const mailboxes = await service.listMailboxes(workspaceId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), mailboxes });
    }) as RequestHandler,

    connectMailbox: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const body = (req.body ?? {}) as ConnectSmtpMailboxInput;
      const mailbox = await service.connectMailbox(workspaceId, body);
      sendPlatformJson(res, 201, { request_id: requestIdFromResponse(res), mailbox });
    }) as RequestHandler,

    verifyMailbox: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const mailboxId = getMailboxId(req);
      const result = await service.verifyMailbox(workspaceId, mailboxId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), ...result });
    }) as RequestHandler,

    deleteMailbox: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const mailboxId = getMailboxId(req);
      const result = await service.deleteMailbox(workspaceId, mailboxId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), ...result });
    }) as RequestHandler,

    listCampaigns: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const campaigns = await service.listCampaigns(workspaceId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), campaigns });
    }) as RequestHandler,

    getCampaign: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const campaignId = getCampaignId(req);
      const campaign = await service.getCampaign(workspaceId, campaignId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), campaign });
    }) as RequestHandler,

    createCampaign: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const body = (req.body ?? {}) as CreateSmtpCampaignInput;
      const createdBy = actorId(res.locals as unknown as Record<string, unknown>);
      const campaign = await service.createCampaign(workspaceId, body, createdBy);
      sendPlatformJson(res, 201, { request_id: requestIdFromResponse(res), campaign });
    }) as RequestHandler,

    updateCampaign: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const campaignId = getCampaignId(req);
      const body = (req.body ?? {}) as Partial<CreateSmtpCampaignInput>;
      const campaign = await service.updateCampaignDraft(workspaceId, campaignId, body);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), campaign });
    }) as RequestHandler,

    generateSample: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const body = (req.body ?? {}) as { lead: CreateSmtpCampaignInput["recipients"][number]; brief: string; fromName: string };
      const sample = await service.generateSample(workspaceId, body);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), ...sample });
    }) as RequestHandler,

    activateCampaign: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const campaignId = getCampaignId(req);
      const campaign = await service.activateCampaign(workspaceId, campaignId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), campaign });
    }) as RequestHandler,

    pauseCampaign: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const campaignId = getCampaignId(req);
      const campaign = await service.pauseCampaign(workspaceId, campaignId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), campaign });
    }) as RequestHandler,

    resumeCampaign: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const campaignId = getCampaignId(req);
      const campaign = await service.resumeCampaign(workspaceId, campaignId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), campaign });
    }) as RequestHandler,

    cancelCampaign: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const campaignId = getCampaignId(req);
      const cancelledBy = actorId(res.locals as unknown as Record<string, unknown>);
      const campaign = await service.cancelCampaign(workspaceId, campaignId, cancelledBy);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), campaign });
    }) as RequestHandler,

    deleteCampaign: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const campaignId = getCampaignId(req);
      const result = await service.deleteCampaign(workspaceId, campaignId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), ...result });
    }) as RequestHandler,

    listSuppressions: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const suppressions = await service.listSuppressions(workspaceId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), suppressions });
    }) as RequestHandler,

    deleteSuppression: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const email = routeParam(req.params.email) ?? "";
      const result = await service.deleteSuppression(workspaceId, email);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), ...result });
    }) as RequestHandler,

    /** Internal, token-authenticated one-click unsubscribe completion. */
    unsubscribeInternal: (async (req, res) => {
      const body = (req.body ?? {}) as { token?: string };
      if (!body.token) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "token is required",
        });
      }
      const result = await service.unsubscribe(body.token);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), ...result });
    }) as RequestHandler,
  };
}
