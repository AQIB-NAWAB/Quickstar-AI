import crypto from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import { requestIdFromResponse, sendPlatformJson, type RequestHandler } from "@quickstart/http-server";
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

export function createWidgetTurnsController(turnsService: TurnsService) {
  return {
    executeWidgetTurn: (async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const workspaceId = extractRouteParam(req.params.workspaceId);
      const conversationId = extractRouteParam(req.params.conversationId);
      const body = (req.body ?? {}) as {
        message?: string;
        text?: string;
        actor_id?: string;
        subject_key?: string;
        modality?: "text" | "voice";
      };
      const text = body.message ?? body.text ?? "";
      const rawHeaderKey = req.headers["idempotency-key"];
      const headerKey = Array.isArray(rawHeaderKey) ? rawHeaderKey[0] : rawHeaderKey;
      const idempotencyKey = headerKey || crypto.randomUUID();
      const actorId =
        body.actor_id?.trim() ||
        (body.subject_key?.trim() ? `widget:${body.subject_key.trim()}` : "widget-visitor");

      const stream = wantsEventStream(req);

      const runTurn = (onToken?: (delta: string) => void) =>
        turnsService.executeWidgetTurn({
          workspaceId,
          conversationId,
          text,
          idempotencyKey,
          actorId,
          requestId,
          onToken,
          modality: body.modality,
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
          res.write(`event: token\n`);
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        });
        openSse();
        if (result.handoff) {
          res.write(`event: handoff\n`);
          res.write(
            `data: ${JSON.stringify({ message: "A teammate is in this chat and will reply here." })}\n\n`,
          );
          res.write(`event: done\n`);
          res.write(`data: ${JSON.stringify({ turn: result })}\n\n`);
          res.end();
          return;
        }
        if (result.deduplicated && result.assistant_message.text && !tokensStarted) {
          res.write(`event: token\n`);
          res.write(
            `data: ${JSON.stringify({ delta: result.assistant_message.text })}\n\n`,
          );
        }
        res.write(`event: done\n`);
        res.write(`data: ${JSON.stringify({ turn: result })}\n\n`);
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
              : "Widget turn stream failed";
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ message, code: ErrorCode.UPSTREAM_UNAVAILABLE })}\n\n`);
        res.end();
      }
    }) as RequestHandler,
  };
}
