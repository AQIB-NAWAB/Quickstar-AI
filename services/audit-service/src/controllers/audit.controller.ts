import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import type { AuditService } from "../services/audit.service.js";
import { routeParam } from "../utils/route-param.js";

export const AUDIT_READ = WORKSPACE_PERMISSIONS.AUDIT_READ;

export function createAuditController(audit: AuditService) {
  return {
    list: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const q = req.query as Record<string, string | undefined>;
      const limitRaw = q.limit ? Number(q.limit) : undefined;
      const result = await audit.list(workspaceId, {
        from: q.from,
        to: q.to,
        action: q.action,
        cursor: q.cursor,
        limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
      });
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,
  };
}
