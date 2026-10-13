import crypto from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import type { TurnsService } from "../services/turns.service.js";

function extractRouteParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0];
  return val ?? "";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createEvalTurnsController(turnsService: TurnsService) {
  return {
    executeEvalTurn: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const workspaceId = extractRouteParam(req.params.workspaceId);
      const body = (req.body ?? {}) as {
        agent_id?: string;
        agent_version_id?: string;
        message?: string;
        text?: string;
        idempotency_key?: string;
        deadline_ms?: number;
      };

      const agentId = body.agent_id?.trim() ?? "";
      const agentVersionId = body.agent_version_id?.trim() ?? "";
      const text = (body.message ?? body.text ?? "").trim();
      if (!UUID_RE.test(workspaceId)) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "workspaceId must be a UUID",
        });
      }
      if (!UUID_RE.test(agentId) || !UUID_RE.test(agentVersionId)) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "agent_id and agent_version_id must be UUIDs",
        });
      }
      if (!text) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "message is required",
        });
      }

      const rawHeaderKey = req.headers["idempotency-key"];
      const headerKey = Array.isArray(rawHeaderKey) ? rawHeaderKey[0] : rawHeaderKey;
      const idempotencyKey =
        body.idempotency_key?.trim() || headerKey || crypto.randomUUID();

      const result = await turnsService.executeEvalTurn({
        workspaceId,
        agentId,
        agentVersionId,
        text,
        idempotencyKey,
        requestId,
        deadlineMs: body.deadline_ms,
      });

      const statusCode = result.deduplicated ? 200 : 201;
      sendPlatformJson(res, statusCode, {
        request_id: requestId,
        turn: {
          ...result,
          assistant_text: result.assistant_text,
        },
      });
    }) as RequestHandler,
  };
}
