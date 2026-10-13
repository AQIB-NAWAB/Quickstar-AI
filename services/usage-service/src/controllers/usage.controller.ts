import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import { WORKSPACE_PERMISSIONS, type UsageFactIngestBody } from "@quickstart/contracts";
import type { UsageService } from "../services/usage.service.js";
import { routeParam } from "../utils/route-param.js";

export const USAGE_READ = WORKSPACE_PERMISSIONS.USAGE_READ;

export function createUsageController(usage: UsageService) {
  return {
    ingest: (async (req, res) => {
      const body = (req.body ?? {}) as UsageFactIngestBody;
      const { entry, inserted } = await usage.ingest(body);
      sendPlatformJson(res, inserted ? 201 : 200, {
        request_id: requestIdFromResponse(res),
        entry,
        inserted,
      });
    }) as RequestHandler,

    list: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
      const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
      const result = await usage.list(workspaceId, {
        limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
        kind,
      });
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,
  };
}
