import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import { parseMultipartUpload } from "../lib/multipart.js";
import type { SourcesService } from "../services/sources.service.js";
import { routeParam } from "../utils/route-param.js";

export function createSourcesController(sources: SourcesService) {
  return {
    create: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      if (!req.body || typeof req.body !== "object") {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Request body must be a valid JSON object",
        });
      }

      const body = req.body as {
        name?: unknown;
        content?: unknown;
        type?: unknown;
        url?: unknown;
        content_type?: unknown;
      };

      const name = typeof body.name === "string" ? body.name : undefined;
      const content = typeof body.content === "string" ? body.content : undefined;
      const type = typeof body.type === "string" ? body.type : "text";
      const url = typeof body.url === "string" ? body.url : undefined;
      const contentType = typeof body.content_type === "string" ? body.content_type : undefined;

      const source = await sources.createSource(tenant.workspaceId, {
        name,
        content,
        type,
        url,
        content_type: contentType,
      });

      sendPlatformJson(res, 201, { request_id: requestId, source });
    }) as RequestHandler,

    upload: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;

      const parsed = await parseMultipartUpload(req);

      const source = await sources.uploadSource(tenant.workspaceId, {
        name: parsed.name,
        fileName: parsed.fileName,
        buffer: parsed.buffer,
        mimeType: parsed.mimeType,
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

      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

      const result = await sources.list(tenant.workspaceId, {
        search,
        status,
        type,
        limit,
        cursor,
      });

      sendPlatformJson(res, 200, {
        request_id: requestId,
        sources: result.sources,
        total: result.total,
        total_workspace_count: result.total_workspace_count,
        status_counts: result.status_counts,
        next_cursor: result.next_cursor,
      });
    }) as RequestHandler,

    listChunks: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const sourceId = routeParam(req.params.sourceId);

      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

      const result = await sources.listChunks(tenant.workspaceId, sourceId, { limit, cursor });

      sendPlatformJson(res, 200, {
        request_id: requestId,
        source_id: result.source_id,
        source_version: result.source_version,
        chunk_count: result.chunk_count,
        chunks: result.chunks,
        next_cursor: result.next_cursor,
      });
    }) as RequestHandler,

    update: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const sourceId = routeParam(req.params.sourceId);

      if (!req.body || typeof req.body !== "object") {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Request body must be a valid JSON object",
        });
      }

      const body = req.body as {
        name?: unknown;
        content?: unknown;
        content_type?: unknown;
      };

      const name = typeof body.name === "string" ? body.name : undefined;
      const content = typeof body.content === "string" ? body.content : undefined;
      const contentType = typeof body.content_type === "string" ? body.content_type : undefined;

      const source = await sources.updateSource(tenant.workspaceId, sourceId, {
        name,
        content,
        contentType,
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
