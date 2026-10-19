import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import { AppError, ErrorCode } from "@quickstart/errors";
import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import type { WebhooksService } from "../services/webhooks.service.js";
import { routeParam } from "../utils/route-param.js";

export const WEBHOOKS_READ = WORKSPACE_PERMISSIONS.WEBHOOKS_READ;
export const WEBHOOKS_MANAGE = WORKSPACE_PERMISSIONS.WEBHOOKS_MANAGE;

function getWorkspaceId(req: { params: Record<string, any> }): string {
  const wid = routeParam(req.params.workspaceId);
  if (!wid) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "workspaceId parameter is required",
    });
  }
  return wid;
}

export function createWebhooksController(service: WebhooksService) {
  return {
    listEndpoints: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const endpoints = await service.listEndpoints(workspaceId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        endpoints,
      });
    }) as RequestHandler,

    getEndpoint: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const endpointId = routeParam(req.params.endpointId);
      if (!endpointId) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "endpointId is required" });
      }
      const endpoint = await service.getEndpoint(workspaceId, endpointId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        endpoint,
      });
    }) as RequestHandler,

    createEndpoint: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const body = (req.body ?? {}) as { url?: string; events?: string[] };
      if (!body.url || !body.events) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "url and events array are required",
        });
      }
      const result = await service.createEndpoint(workspaceId, {
        url: body.url,
        events: body.events,
      });
      sendPlatformJson(res, 201, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    updateEndpoint: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const endpointId = routeParam(req.params.endpointId);
      if (!endpointId) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "endpointId is required" });
      }
      const body = (req.body ?? {}) as { url?: string; events?: string[]; status?: string };
      const endpoint = await service.updateEndpoint(workspaceId, endpointId, body);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        endpoint,
      });
    }) as RequestHandler,

    rotateSecret: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const endpointId = routeParam(req.params.endpointId);
      if (!endpointId) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "endpointId is required" });
      }
      const result = await service.rotateSecret(workspaceId, endpointId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    deleteEndpoint: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const endpointId = routeParam(req.params.endpointId);
      if (!endpointId) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "endpointId is required" });
      }
      await service.deleteEndpoint(workspaceId, endpointId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        deleted: true,
      });
    }) as RequestHandler,

    listDeliveries: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const q = req.query as Record<string, string | undefined>;
      const endpointId = routeParam(req.params.endpointId) || (q.webhookId ? String(q.webhookId) : undefined);
      const limitRaw = q.limit ? Number(q.limit) : undefined;

      const deliveries = await service.listDeliveries(
        workspaceId,
        endpointId,
        Number.isFinite(limitRaw) ? limitRaw : undefined,
      );
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        deliveries,
      });
    }) as RequestHandler,

    getDelivery: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const deliveryId = routeParam(req.params.deliveryId);
      if (!deliveryId) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "deliveryId is required" });
      }
      const delivery = await service.getDelivery(workspaceId, deliveryId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        delivery,
      });
    }) as RequestHandler,

    redriveDelivery: (async (req, res) => {
      const workspaceId = getWorkspaceId(req);
      const deliveryId = routeParam(req.params.deliveryId);
      if (!deliveryId) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "deliveryId is required" });
      }
      const delivery = await service.redriveDelivery(workspaceId, deliveryId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        delivery,
      });
    }) as RequestHandler,
  };
}
