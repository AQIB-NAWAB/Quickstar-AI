import crypto from "node:crypto";
import {
  asyncHandler,
  createServiceRouter,
  requestIdFromResponse,
  type RouteModule,
} from "@quickstart/http-server";
import type { GatewayHttpContext } from "../context.js";

type ChatMessage = { role?: string; content?: unknown };
type ChatBody = {
  model?: string;
  stream?: boolean;
  session_id?: string;
  messages?: ChatMessage[];
};

const sessionTtlMs = 24 * 60 * 60 * 1000;
const sessions = new Map<string, { conversationId: string; touchedAt: number }>();

function bearer(req: { headers: Record<string, string | string[] | undefined> }): string {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function sameSecret(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const item = part as { type?: unknown; text?: unknown };
      return item.type === "text" && typeof item.text === "string" ? item.text : "";
    })
    .filter(Boolean)
    .join(" ");
}

function lastUserMessage(messages: ChatMessage[] | undefined): string {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return textContent(messages[i]?.content).trim();
  }
  return "";
}

function openAiError(res: any, status: number, message: string): void {
  res.status(status).json({
    error: { message, type: status === 401 ? "authentication_error" : "invalid_request_error" },
  });
}

async function createConversation(
  baseUrl: string,
  token: string,
  workspaceId: string,
  agentId: string,
  requestId: string,
  timeoutMs: number,
): Promise<string> {
  const response = await fetch(
    `${baseUrl}/internal/workspaces/${encodeURIComponent(workspaceId)}/widget/conversations`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-request-id": requestId,
      },
      body: JSON.stringify({ agent_id: agentId }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  const result = (await response.json().catch(() => ({}))) as {
    conversation?: { id?: string };
    error?: { message?: string };
  };
  const id = result.conversation?.id;
  if (response.status !== 201 || !id) {
    throw new Error(result.error?.message ?? `Conversation setup failed (${response.status})`);
  }
  return id;
}

function emitChunk(res: any, id: string, created: number, model: string, delta: Record<string, unknown>): void {
  res.write(
    `data: ${JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta, finish_reason: null }],
    })}\n\n`,
  );
}

export const createCustomLlmRoutes: RouteModule<GatewayHttpContext> = (ctx) => {
  const router = createServiceRouter();

  router.post(
    "/v1/chat/completions",
    asyncHandler(async (req, res) => {
      const config = ctx.config;
      const target = ctx.customLlm;
      if (!target.workspaceId || !target.agentId || !target.token) {
        openAiError(res, 503, "QuickStart custom LLM endpoint is not configured");
        return;
      }
      if (!sameSecret(bearer(req), target.token)) {
        openAiError(res, 401, "Invalid bearer token");
        return;
      }

      const body = (req.body ?? {}) as ChatBody;
      const fishSessionId = body.session_id?.trim();
      const userText = lastUserMessage(body.messages);
      if (!fishSessionId || !userText) {
        openAiError(res, 400, "session_id and a non-empty user message are required");
        return;
      }

      const now = Date.now();
      for (const [key, value] of sessions) {
        if (now - value.touchedAt > sessionTtlMs) sessions.delete(key);
      }
      const sessionKey = `${target.workspaceId}:${fishSessionId}`;
      let session = sessions.get(sessionKey);
      if (!session) {
        try {
          const conversationId = await createConversation(
            config.conversationUrl,
            config.internalToken,
            target.workspaceId,
            target.agentId,
            requestIdFromResponse(res),
            config.httpRequestTimeoutMs,
          );
          session = { conversationId, touchedAt: now };
          sessions.set(sessionKey, session);
        } catch (error) {
          openAiError(res, 502, error instanceof Error ? error.message : "Could not start agent session");
          return;
        }
      }
      session.touchedAt = now;

      const turnId = crypto
        .createHash("sha256")
        .update(JSON.stringify(body.messages ?? []))
        .digest("hex");
      const idempotencyKey = `fish-${crypto.createHash("sha256").update(`${sessionKey}:${turnId}`).digest("hex")}`;
      const id = `chatcmpl-${crypto.randomUUID()}`;
      const model = body.model || "quickstart-agent";
      const created = Math.floor(Date.now() / 1000);
      const streaming = body.stream === true;
      if (streaming) {
        res.status(200);
        res.setHeader("content-type", "text/event-stream; charset=utf-8");
        res.setHeader("cache-control", "no-cache, no-transform");
        res.setHeader("connection", "keep-alive");
        res.setHeader("x-accel-buffering", "no");
        res.flushHeaders?.();
        emitChunk(res, id, created, model, { role: "assistant" });
      }
      const keepAlive = streaming ? setInterval(() => res.write(": keepalive\n\n"), 2000) : undefined;
      const finishStreamError = (message: string) => {
        if (keepAlive) clearInterval(keepAlive);
        if (streaming) {
          res.write(`data: ${JSON.stringify({ error: { message } })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        } else {
          openAiError(res, 502, message);
        }
      };
      const runtimeUrl =
        `${config.runtimeUrl}/internal/workspaces/${encodeURIComponent(target.workspaceId)}` +
        `/widget/conversations/${encodeURIComponent(session.conversationId)}/turns`;
      let upstream: Response;
      try {
        upstream = await fetch(runtimeUrl, {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.internalToken}`,
            "content-type": "application/json",
            accept: "text/event-stream",
            "x-request-id": requestIdFromResponse(res),
            "idempotency-key": idempotencyKey,
          },
          body: JSON.stringify({
            message: userText,
            actor_id: `fishaudio:${fishSessionId}`,
            modality: "voice",
            reply_language: "en",
            reply_gender: "neutral",
          }),
          signal: AbortSignal.timeout(config.httpRequestTimeoutMs),
        });
      } catch {
        finishStreamError("QuickStart agent runtime is unavailable");
        return;
      }
      if (!upstream.ok || !upstream.body) {
        const detail = await upstream.text().catch(() => "");
        finishStreamError(detail.slice(0, 500) || `QuickStart runtime failed (${upstream.status})`);
        return;
      }

      let answer = "";
      let pending = "";
      let eventName = "message";

      const consumeEvent = (raw: string) => {
        let data = "";
        for (const line of raw.split(/\r?\n/)) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (!data) {
          eventName = "message";
          return;
        }
        let parsed: Record<string, any>;
        try {
          parsed = JSON.parse(data);
        } catch {
          eventName = "message";
          return;
        }
        if (eventName === "token" && typeof parsed.delta === "string") {
          answer += parsed.delta;
          if (streaming) emitChunk(res, id, created, model, { content: parsed.delta });
        } else if (eventName === "nudge" && typeof parsed.text === "string") {
          answer += parsed.text;
          if (streaming) emitChunk(res, id, created, model, { content: parsed.text });
        } else if (eventName === "error") {
          throw new Error(typeof parsed.message === "string" ? parsed.message : "Agent turn failed");
        }
        eventName = "message";
      };

      try {
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          let boundary: number;
          while ((boundary = pending.search(/\r?\n\r?\n/)) >= 0) {
            const separator = pending.slice(boundary).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n";
            const event = pending.slice(0, boundary);
            pending = pending.slice(boundary + separator.length);
            consumeEvent(event);
          }
        }
        if (pending.trim()) consumeEvent(pending);
      } catch (error) {
        if (!streaming) {
          openAiError(res, 502, error instanceof Error ? error.message : "Agent turn failed");
          return;
        }
        if (keepAlive) clearInterval(keepAlive);
        res.write(`data: ${JSON.stringify({ error: { message: "QuickStart agent turn failed" } })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      if (streaming) {
        if (keepAlive) clearInterval(keepAlive);
        res.write(`data: ${JSON.stringify({
          id,
          object: "chat.completion.chunk",
          created,
          model,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      res.status(200).json({
        id,
        object: "chat.completion",
        created,
        model,
        choices: [{ index: 0, message: { role: "assistant", content: answer }, finish_reason: "stop" }],
      });
    }),
  );

  return router;
};
