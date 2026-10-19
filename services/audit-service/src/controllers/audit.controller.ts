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
        actor: q.actor,
        q: q.q,
        cursor: q.cursor,
        limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
      });
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        ...result,
      });
    }) as RequestHandler,

    getById: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const entryId = routeParam(req.params.entryId);
      const entry = await audit.getById(workspaceId, entryId);
      sendPlatformJson(res, 200, {
        request_id: requestIdFromResponse(res),
        entry,
      });
    }) as RequestHandler,

    exportCsv: (async (req, res) => {
      const workspaceId = routeParam(req.params.workspaceId);
      const q = req.query as Record<string, string | undefined>;
      const limitRaw = q.limit ? Number(q.limit) : undefined;

      const csvContent = await audit.exportCsv(workspaceId, {
        from: q.from,
        to: q.to,
        action: q.action,
        actor: q.actor,
        q: q.q,
        limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `audit-log-${workspaceId}-${dateStr}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    }) as RequestHandler,
  };
}
