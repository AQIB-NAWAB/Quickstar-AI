import crypto from "node:crypto";
import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { AUTH_CONTEXT_HEADER } from "@quickstart/auth";
import type { TurnsService } from "../services/turns.service.js";

function extractRouteParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0];
  return val ?? "";
}

export function createTurnsController(turnsService: TurnsService) {
  return {
    executeTurn: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const workspaceId = extractRouteParam(req.params.workspaceId);
      const conversationId = extractRouteParam(req.params.conversationId);

      const body = (req.body ?? {}) as {
        message?: string;
        text?: string;
        idempotency_key?: string;
        channel?: "chat" | "voice" | "widget";
        deadline_ms?: number;
        call_id?: string;
      };

      const text = body.message ?? body.text ?? "";
      const rawHeaderKey = req.headers["idempotency-key"];
      const headerKey = Array.isArray(rawHeaderKey) ? rawHeaderKey[0] : rawHeaderKey;
      const idempotencyKey = headerKey || body.idempotency_key || crypto.randomUUID();

      const tenantContext = res.locals.tenantContext;
      const actorId = tenantContext?.actorId ?? "anonymous-user";

      // Forward auth headers to internal services
      const authHeaders: Record<string, string> = {};
      if (req.headers.authorization) {
        authHeaders.authorization = req.headers.authorization;
      }
      if (req.headers[AUTH_CONTEXT_HEADER]) {
        authHeaders[AUTH_CONTEXT_HEADER] = req.headers[AUTH_CONTEXT_HEADER] as string;
      }
      authHeaders["x-request-id"] = requestId;

      const result = await turnsService.executeTurn({
        workspaceId,
        conversationId,
        text,
        idempotencyKey,
        actorId,
        authHeaders,
        requestId,
        channel: body.channel,
        deadlineMs: body.deadline_ms,
        callId: body.call_id,
      });

      const statusCode = result.deduplicated ? 200 : 201;

      sendPlatformJson(res, statusCode, {
        request_id: requestId,
        turn: result,
      });
    }) as RequestHandler,
  };
}
