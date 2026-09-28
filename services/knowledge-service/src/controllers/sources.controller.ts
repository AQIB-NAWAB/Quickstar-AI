import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { routeParam } from "../utils/route-param.js";
import type { SourcesService } from "../services/sources.service.js";

export function createSourcesController(sources: SourcesService) {
  return {
    create: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as {
        name?: string;
        content?: string;
        type?: string;
        content_type?: string;
      };
      const kind =
        body.type === "document" || body.type === "file" ? "document" : "text";
      const source = await sources.createSource(tenant.workspaceId, {
        name: body.name ?? "",
        content: body.content ?? "",
        kind,
        contentType: body.content_type,
      });
      sendPlatformJson(res, 201, { request_id: requestId, source });
    }) as RequestHandler,

    get: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const sourceId = routeParam(req.params.sourceId);
      const source = await sources.get(tenant.workspaceId, sourceId);
      sendPlatformJson(res, 200, { request_id: requestId, source });
    }) as RequestHandler,

    list: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const limit = Number(req.query.limit ?? 20);
      const rows = await sources.list(tenant.workspaceId, limit);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        sources: rows,
        total: rows.length,
      });
    }) as RequestHandler,

    update: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const sourceId = routeParam(req.params.sourceId);
      const body = req.body as { name?: string; content?: string; content_type?: string };
      const source = await sources.updateSource(tenant.workspaceId, sourceId, {
        name: body.name,
        content: body.content,
        contentType: body.content_type,
      });
      sendPlatformJson(res, 200, { request_id: requestId, source });
    }) as RequestHandler,

    delete: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const sourceId = routeParam(req.params.sourceId);
      const result = await sources.delete(tenant.workspaceId, sourceId);
      sendPlatformJson(res, 200, { request_id: requestId, ...result });
    }) as RequestHandler,
  };
}

export const KNOWLEDGE_READ = WORKSPACE_PERMISSIONS.KNOWLEDGE_READ;
export const KNOWLEDGE_WRITE = WORKSPACE_PERMISSIONS.KNOWLEDGE_WRITE;
