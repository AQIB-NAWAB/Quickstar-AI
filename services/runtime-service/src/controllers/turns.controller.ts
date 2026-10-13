import crypto from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
import { AUTH_CONTEXT_HEADER } from "@quickstart/auth";
import type { TurnsService } from "../services/turns.service.js";

function extractRouteParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0];
  return val ?? "";
}

function wantsEventStream(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const raw = req.headers.accept;
  const accept = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  return accept.includes("text/event-stream");
}

function writeSse(res: { write: (chunk: string) => boolean }, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
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

      const authHeaders: Record<string, string> = {};
      if (req.headers.authorization) {
        authHeaders.authorization = req.headers.authorization;
      }
      if (req.headers[AUTH_CONTEXT_HEADER]) {
        authHeaders[AUTH_CONTEXT_HEADER] = req.headers[AUTH_CONTEXT_HEADER] as string;
      }
      authHeaders["x-request-id"] = requestId;

      const stream = wantsEventStream(req);
      const runTurn = (onToken?: (delta: string) => void) =>
        turnsService.executeTurn({
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
          onToken,
        });

      if (!stream) {
        const result = await runTurn();
        const statusCode = result.deduplicated ? 200 : 201;
        sendPlatformJson(res, statusCode, {
          request_id: requestId,
          turn: result,
        });
        return;
      }

      let sseOpen = false;
      let tokensStarted = false;
      const openSse = () => {
        if (sseOpen) return;
        sseOpen = true;
        res.status(201);
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("X-Accel-Buffering", "no");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("x-request-id", requestId);
        res.flushHeaders?.();
        res.socket?.setNoDelay?.(true);
      };

      try {
        const result = await runTurn((delta) => {
          openSse();
          tokensStarted = true;
          writeSse(res, "token", { delta });
        });
        openSse();
        if (result.deduplicated && result.assistant_message.text && !tokensStarted) {
          writeSse(res, "token", { delta: result.assistant_message.text });
        }
        writeSse(res, "done", { turn: result });
        res.end();
      } catch (error) {
        if (!sseOpen) {
          throw error;
        }
        const message =
          error instanceof AppError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Turn stream failed";
        writeSse(res, "error", { message, code: ErrorCode.UPSTREAM_UNAVAILABLE });
        res.end();
      }
    }) as RequestHandler,
  };
}
