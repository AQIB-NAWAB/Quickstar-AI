import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { routeParam } from "../utils/route-param.js";
import type { FactsService } from "../services/facts.service.js";

export function createFactsController(facts: FactsService) {
  return {
    list: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const subjectKey = String(req.query.subject_key ?? "");
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const rows = await facts.list(tenant.workspaceId, subjectKey, limit);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        facts: rows,
        total: rows.length,
      });
    }) as RequestHandler,

    create: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = req.body as {
        subject_key?: string;
        fact_key?: string | null;
        fact_text?: string;
      };
      const fact = await facts.create(tenant.workspaceId, tenant.actorId, {
        subject_key: body.subject_key ?? "",
        fact_key: body.fact_key,
        fact_text: body.fact_text ?? "",
      });
      sendPlatformJson(res, 201, { request_id: requestId, fact });
    }) as RequestHandler,

    update: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const factId = routeParam(req.params.factId);
      const body = req.body as { fact_text?: string; fact_key?: string | null };
      const fact = await facts.update(tenant.workspaceId, factId, body);
      sendPlatformJson(res, 200, { request_id: requestId, fact });
    }) as RequestHandler,

    deleteOne: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const factId = routeParam(req.params.factId);
      await facts.deleteOne(tenant.workspaceId, factId);
      sendPlatformJson(res, 200, { request_id: requestId, deleted: true });
    }) as RequestHandler,

    deleteBySubject: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const subjectKey = String(req.query.subject_key ?? "");
      const result = await facts.deleteBySubject(tenant.workspaceId, subjectKey);
      sendPlatformJson(res, 200, { request_id: requestId, ...result });
    }) as RequestHandler,
  };
}

export const MEMORY_READ = WORKSPACE_PERMISSIONS.MEMORY_READ;
export const MEMORY_WRITE = WORKSPACE_PERMISSIONS.MEMORY_WRITE;
