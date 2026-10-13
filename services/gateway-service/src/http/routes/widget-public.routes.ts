import crypto from "node:crypto";
import { AppError, ErrorCode } from "@quickstart/errors";
import {
  asyncHandler,
  createServiceRouter,
  requestIdFromResponse,
  sendPlatformJson,
  type RequestHandler,
  type RouteModule,
} from "@quickstart/http-server";
import { getInternalJson, postInternalJson, postInternalRaw } from "../../lib/internal-fetch.js";
import type { WidgetContext } from "../../middleware/require-publishable-key.js";
import type { GatewayHttpContext } from "../context.js";

function widgetContext(res: { locals: unknown }): WidgetContext {
  return (res.locals as { widget: WidgetContext }).widget;
}

function routeParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? "";
  return val ?? "";
}

function applyWidgetCors(req: { headers: Record<string, string | string[] | undefined> }, res: { setHeader: (k: string, v: string) => void }): void {
  const rawOrigin = req.headers.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
  if (!origin) return;
  try {
    const normalizedOrigin = new URL(origin).origin;
    res.setHeader("Access-Control-Allow-Origin", normalizedOrigin);
    res.setHeader("Vary", "Origin");
  } catch {
    /* Invalid Origin — omit CORS; browser will block cross-origin reads. */
  }
}

export const createWidgetPublicRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();
  const { config, requirePublishableKey } = ctx;

  // The browser's CORS preflight does not include X-Publishable-Key, so it
  // cannot be checked against the per-key origin list yet. The actual request
  // is always checked by requirePublishableKey before these headers are added.
  const widgetPreflight: RequestHandler = (req, res) => {
    const rawOrigin = req.headers.origin;
    const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
    if (origin) {
      try {
        const normalizedOrigin = new URL(origin).origin;
        res.setHeader("Access-Control-Allow-Origin", normalizedOrigin);
        res.setHeader("Vary", "Origin");
      } catch {
        res.status(400).end();
        return;
      }
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, X-Publishable-Key, Idempotency-Key, Accept",
    );
    res.setHeader("Access-Control-Max-Age", "600");
    res.status(204).end();
  };

  router.options("/v1/public/widget/conversations", widgetPreflight);
  router.options("/v1/public/widget/conversations/:conversationId/messages", widgetPreflight);
  router.options("/v1/public/widget/conversations/:conversationId/turns", widgetPreflight);

  router.post(
    "/v1/public/widget/conversations",
    requirePublishableKey,
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const widget = widgetContext(res);
      const body = req.body as { agent_id?: string; subject_key?: string | null };
      const agentId = body.agent_id ?? widget.defaultAgentId;
      if (!agentId) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "agent_id is required when the publishable key has no default agent",
          requestId,
        });
      }

      const { status, json } = await postInternalJson<{
        conversation?: { id: string };
        error?: { message?: string };
      }>(
        config.conversationUrl,
        `/internal/workspaces/${encodeURIComponent(widget.workspaceId)}/widget/conversations`,
        config.internalToken,
        { agent_id: agentId, subject_key: body.subject_key ?? null },
        requestId,
        config.httpRequestTimeoutMs,
      );
      if (status !== 201) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: json.error?.message ?? "Failed to create widget conversation",
          requestId,
        });
      }
      sendPlatformJson(res, 201, {
        request_id: requestId,
        conversation_id: json.conversation!.id,
        workspace_id: widget.workspaceId,
      });
    }),
  );

  router.get(
    "/v1/public/widget/conversations/:conversationId/messages",
    requirePublishableKey,
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const widget = widgetContext(res);
      const conversationId = routeParam(req.params.conversationId);
      const afterSeq = req.query.after_seq;
      const query =
        afterSeq !== undefined && afterSeq !== ""
          ? `?after_seq=${encodeURIComponent(String(afterSeq))}`
          : "";

      const { status, json } = await getInternalJson<{
        messages?: unknown[];
        error?: { message?: string };
      }>(
        config.conversationUrl,
        `/internal/workspaces/${encodeURIComponent(widget.workspaceId)}/widget/conversations/${encodeURIComponent(conversationId)}/messages${query}`,
        config.internalToken,
        requestId,
        config.httpRequestTimeoutMs,
      );
      if (status === 404) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Conversation not found",
          requestId,
        });
      }
      if (status !== 200) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: json.error?.message ?? "Failed to list messages",
          requestId,
        });
      }
      sendPlatformJson(res, 200, {
        request_id: requestId,
        messages: json.messages ?? [],
      });
    }),
  );

  router.post(
    "/v1/public/widget/conversations/:conversationId/turns",
    requirePublishableKey,
    asyncHandler(async (req, res) => {
      const requestId = requestIdFromResponse(res);
      const widget = widgetContext(res);
      const conversationId = routeParam(req.params.conversationId);
      const body = req.body as { message?: string; subject_key?: string; actor_id?: string };
      const rawHeaderKey = req.headers["idempotency-key"];
      const headerKey = Array.isArray(rawHeaderKey) ? rawHeaderKey[0] : rawHeaderKey;
      const idempotencyKey = headerKey || crypto.randomUUID();
      const rawAccept = req.headers.accept;
      const accept = Array.isArray(rawAccept) ? rawAccept.join(",") : rawAccept ?? "";
      const wantsStream = accept.includes("text/event-stream");
      const turnPath = `/internal/workspaces/${encodeURIComponent(widget.workspaceId)}/widget/conversations/${encodeURIComponent(conversationId)}/turns`;
      const turnBody = {
        message: body.message ?? "",
        subject_key: body.subject_key,
        actor_id: body.actor_id,
      };

      if (wantsStream) {
        const upstream = await postInternalRaw(
          config.runtimeUrl,
          turnPath,
          config.internalToken,
          turnBody,
          requestId,
          config.httpRequestTimeoutMs,
          {
            Accept: "text/event-stream",
            "idempotency-key": idempotencyKey,
          },
        );
        applyWidgetCors(req, res);
        res.status(upstream.status);
        res.setHeader("x-request-id", requestId);
        res.setHeader("cache-control", "no-cache, no-transform");
        res.setHeader("x-accel-buffering", "no");
        const contentType = upstream.headers.get("content-type");
        if (contentType) {
          res.setHeader("content-type", contentType);
        }
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text();
          res.send(text);
          return;
        }
        res.flushHeaders?.();
        res.socket?.setNoDelay?.(true);
        const reader = upstream.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const ok = res.write(Buffer.from(value));
          if (!ok) {
            await new Promise<void>((resolve) => res.once("drain", resolve));
          }
        }
        res.end();
        return;
      }

      const { status, json } = await postInternalJson<{
        turn?: unknown;
        error?: { message?: string; code?: string };
      }>(
        config.runtimeUrl,
        turnPath,
        config.internalToken,
        turnBody,
        requestId,
        config.httpRequestTimeoutMs,
        { "idempotency-key": idempotencyKey },
      );

      if (status === 404) {
        throw new AppError({
          code: ErrorCode.NOT_FOUND,
          message: "Conversation not found",
          requestId,
        });
      }
      if (status >= 400 && status < 500 && json.error?.code) {
        throw new AppError({
          code: json.error.code as ErrorCode,
          message: json.error.message ?? "Widget turn rejected",
          requestId,
        });
      }
      if (status !== 200 && status !== 201) {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: json.error?.message ?? "Widget turn failed",
          requestId,
        });
      }

      applyWidgetCors(req, res);
      res.status(status);
      res.setHeader("x-request-id", requestId);
      res.setHeader("content-type", "application/json");
      res.send(JSON.stringify({ request_id: requestId, turn: json.turn }));
    }),
  );

  return router;
};
