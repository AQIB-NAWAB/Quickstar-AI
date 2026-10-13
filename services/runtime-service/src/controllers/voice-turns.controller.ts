import crypto from "node:crypto";
import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { TurnsService } from "../services/turns.service.js";

function extractRouteParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0];
  return val ?? "";
}

export function createVoiceTurnsController(turnsService: TurnsService) {
  return {
    executeVoiceTurn: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const workspaceId = extractRouteParam(req.params.workspaceId);
      const conversationId = extractRouteParam(req.params.conversationId);
      const body = (req.body ?? {}) as {
        message?: string;
        text?: string;
        call_id?: string;
        deadline_ms?: number;
        actor_id?: string;
      };
      const text = body.message ?? body.text ?? "";
      const rawHeaderKey = req.headers["idempotency-key"];
      const headerKey = Array.isArray(rawHeaderKey) ? rawHeaderKey[0] : rawHeaderKey;
      const idempotencyKey = headerKey || crypto.randomUUID();
      const callId = body.call_id?.trim() || undefined;
      const actorId =
        body.actor_id?.trim() || (callId ? `voice:${callId}` : "voice-edge");

      const result = await turnsService.executeVoiceTurn({
        workspaceId,
        conversationId,
        text,
        idempotencyKey,
        actorId,
        requestId,
        callId,
        deadlineMs: body.deadline_ms,
      });

      const statusCode = result.deduplicated ? 200 : 201;
      sendPlatformJson(res, statusCode, {
        request_id: requestId,
        turn: result,
      });
    }) as RequestHandler,
  };
}
