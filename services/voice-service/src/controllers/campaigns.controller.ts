import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { routeParam } from "../lib/route-param.js";
import type { CampaignsService } from "../services/campaigns.service.js";

export function createCampaignsController(campaigns: CampaignsService) {
  return {
    list: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const rows = await campaigns.list(workspaceId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), campaigns: rows });
    }) as RequestHandler,

    create: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const body = (req.body ?? {}) as {
        name?: string;
        agent_id?: string;
        concurrency_cap?: number;
      };
      const row = await campaigns.create(workspaceId, {
        name: body.name ?? "",
        agent_id: body.agent_id ?? "",
        concurrency_cap: body.concurrency_cap,
      });
      sendPlatformJson(res, 201, { request_id: requestIdFromResponse(res), campaign: row });
    }) as RequestHandler,

    start: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const row = await campaigns.start(workspaceId, campaignId);
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), campaign: row });
    }) as RequestHandler,

    addTargets: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const body = (req.body ?? {}) as { phones?: string[] };
      const targets = await campaigns.addTargets(workspaceId, campaignId, body.phones ?? []);
      sendPlatformJson(res, 201, { request_id: requestIdFromResponse(res), targets });
    }) as RequestHandler,

    processBatch: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const campaignId = routeParam(req.params.campaignId);
      const body = (req.body ?? {}) as { conversation_id?: string; limit?: number };
      if (!body.conversation_id) {
        sendPlatformJson(res, 400, {
          request_id: requestIdFromResponse(res),
          error: { code: "VALIDATION_FAILED", message: "conversation_id is required" },
        });
        return;
      }
      const result = await campaigns.processBatch(workspaceId, campaignId, {
        conversationId: body.conversation_id,
        limit: body.limit,
        requestId: requestIdFromResponse(res),
        authHeaders: {
          authorization:
            typeof req.headers.authorization === "string" ? req.headers.authorization : "",
        },
      });
      sendPlatformJson(res, 200, { request_id: requestIdFromResponse(res), ...result });
    }) as RequestHandler,
  };
}
