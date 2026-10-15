import { AppError, ErrorCode } from "@quickstart/errors";
import type { WidgetTurnResult } from "./runtime.client.js";

export async function streamWidgetTurn(
  input: {
    runtimeUrl: string;
    internalToken: string;
    workspaceId: string;
    conversationId: string;
    actorId: string;
    text: string;
    idempotencyKey: string;
    requestId: string;
    modality?: "text" | "voice";
    replyLanguage?: string;
    signal?: AbortSignal;
    onNudge?: (text: string) => void;
    onTransfer?: () => void;
  },
  onToken: (delta: string) => void,
): Promise<WidgetTurnResult> {
  const base = input.runtimeUrl.replace(/\/$/, "");
  const url = `${base}/internal/workspaces/${encodeURIComponent(input.workspaceId)}/widget/conversations/${encodeURIComponent(input.conversationId)}/turns`;
  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.internalToken}`,
      "idempotency-key": input.idempotencyKey,
      "x-request-id": input.requestId,
      accept: "text/event-stream",
    },
    body: JSON.stringify({
      message: input.text,
      actor_id: input.actorId,
      modality: input.modality ?? "voice",
      reply_language: input.replyLanguage,
    }),
    signal: input.signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new AppError({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
      message: `Runtime widget stream failed (${res.status}): ${body.slice(0, 200)}`,
    });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let turn: WidgetTurnResult | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
      let eventName = "message";
      let dataLine = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      let data: {
        delta?: string;
        text?: string;
        turn?: {
          deduplicated: boolean;
          conversation_id: string;
          agent_id: string;
          agent_version_id: string;
          assistant_message: { id: string; text: string; seq: number };
          user_message?: { id: string; text: string; seq: number };
        };
        message?: string;
      };
      try {
        data = JSON.parse(dataLine);
      } catch {
        continue;
      }
      if (eventName === "token" && data.delta) onToken(data.delta);
      else if (eventName === "nudge" && data.text) input.onNudge?.(data.text);
      else if (eventName === "transfer") input.onTransfer?.();
      else if (eventName === "done" && data.turn) {
        turn = {
          assistant_text: data.turn.assistant_message.text,
          agent_id: data.turn.agent_id,
          agent_version_id: data.turn.agent_version_id,
          conversation_id: data.turn.conversation_id,
          latency_ms: Date.now() - started,
          deduplicated: data.turn.deduplicated,
          assistant_message: data.turn.assistant_message,
          user_message: data.turn.user_message,
        };
      } else if (eventName === "error") {
        throw new AppError({
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: data.message ?? "Widget stream error",
        });
      }
    }
  }

  if (!turn) {
    throw new AppError({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
      message: "Widget stream ended before completion",
    });
  }
  return turn;
}
