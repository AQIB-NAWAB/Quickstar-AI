import { WORKSPACE_PERMISSIONS } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import {
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
} from "@quickstart/http-server";
import { routeParam } from "../utils/route-param.js";
import type { FactsService } from "../services/facts.service.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateFactId(factId: unknown, requestId: string): string {
  if (typeof factId !== "string" || !UUID_REGEX.test(factId)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Valid fact UUID required",
      requestId,
    });
  }
  return factId;
}

function ensureObjectBody(body: unknown, requestId: string): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "Request body must be a JSON object",
      requestId,
    });
  }
  return body as Record<string, unknown>;
}

export function createFactsController(facts: FactsService) {
  return {
    list: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const subjectKey = req.query.subject_key;
      if (subjectKey === undefined || subjectKey === null || typeof subjectKey !== "string") {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "subject_key query parameter is required",
          requestId,
        });
      }
      const limit = req.query.limit;
      const result = await facts.list(tenant.workspaceId, subjectKey, limit);
      sendPlatformJson(res, 200, {
        request_id: requestId,
        facts: result.facts,
        total: result.total,
      });
    }) as RequestHandler,

    create: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const body = ensureObjectBody(req.body, requestId);

      const fact = await facts.create(tenant.workspaceId, tenant.actorId, {
        subject_key: body.subject_key,
        fact_key: body.fact_key,
        fact_text: body.fact_text,
      });
      sendPlatformJson(res, 201, { request_id: requestId, fact });
    }) as RequestHandler,

    update: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const factId = validateFactId(routeParam(req.params.factId), requestId);
      const body = ensureObjectBody(req.body, requestId);

      const fact = await facts.update(tenant.workspaceId, factId, {
        fact_text: body.fact_text,
        fact_key: body.fact_key,
      });
      sendPlatformJson(res, 200, { request_id: requestId, fact });
    }) as RequestHandler,

    deleteOne: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const factId = validateFactId(routeParam(req.params.factId), requestId);
      await facts.deleteOne(tenant.workspaceId, factId);
      sendPlatformJson(res, 200, { request_id: requestId, deleted: true });
    }) as RequestHandler,

    deleteBySubject: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const tenant = res.locals.tenantContext!;
      const subjectKey = req.query.subject_key;
      if (subjectKey === undefined || subjectKey === null || typeof subjectKey !== "string") {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "subject_key query parameter is required",
          requestId,
        });
      }
      const result = await facts.deleteBySubject(tenant.workspaceId, subjectKey);
      sendPlatformJson(res, 200, { request_id: requestId, ...result });
    }) as RequestHandler,
  };
}

export const MEMORY_READ = WORKSPACE_PERMISSIONS.MEMORY_READ;
export const MEMORY_WRITE = WORKSPACE_PERMISSIONS.MEMORY_WRITE;
