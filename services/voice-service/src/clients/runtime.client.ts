import { DEFAULT_VOICE_DEADLINE_MS } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";

export type VoiceTurnResult = {
  assistant_text: string;
  agent_id: string;
  agent_version_id: string;
  conversation_id: string;
  latency_ms: number;
  deduplicated: boolean;
};

export type WidgetTurnResult = VoiceTurnResult & {
  user_message?: { id: string; text: string; seq: number };
  assistant_message: { id: string; text: string; seq: number };
};

export type RuntimeClient = {
  executeWidgetTurn(input: {
    workspaceId: string;
    conversationId: string;
    text: string;
    idempotencyKey: string;
    actorId: string;
    requestId: string;
    modality?: "text" | "voice";
  }): Promise<WidgetTurnResult>;
  executeVoiceTurn(input: {
    workspaceId: string;
    conversationId: string;
    text: string;
    callId: string;
    idempotencyKey: string;
    authHeaders: Record<string, string>;
    deadlineMs?: number;
    requestId: string;
  }): Promise<VoiceTurnResult>;
};

export function createHttpRuntimeClient(
  baseUrl: string,
  timeoutMs: number,
  internalToken: string,
): RuntimeClient {
  return {
    async executeWidgetTurn(input) {
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(
          `${baseUrl}/internal/workspaces/${encodeURIComponent(input.workspaceId)}/widget/conversations/${encodeURIComponent(input.conversationId)}/turns`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${internalToken}`,
              "idempotency-key": input.idempotencyKey,
              "x-request-id": input.requestId,
            },
            body: JSON.stringify({
              message: input.text,
              actor_id: input.actorId,
              modality: input.modality ?? "voice",
            }),
            signal: controller.signal,
          },
        );
        if (!res.ok) {
          const body = await res.text();
          throw new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: `Runtime widget turn failed (${res.status}): ${body.slice(0, 200)}`,
          });
        }
        const json = (await res.json()) as {
          turn: {
            deduplicated: boolean;
            conversation_id: string;
            agent_id: string;
            agent_version_id: string;
            user_message?: { id: string; text: string; seq: number };
            assistant_message: { id: string; text: string; seq: number };
          };
        };
        return {
          assistant_text: json.turn.assistant_message.text,
          agent_id: json.turn.agent_id,
          agent_version_id: json.turn.agent_version_id,
          conversation_id: json.turn.conversation_id,
          latency_ms: Date.now() - started,
          deduplicated: json.turn.deduplicated,
          user_message: json.turn.user_message,
          assistant_message: json.turn.assistant_message,
        };
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: err instanceof Error ? err.message : "Runtime widget turn failed",
        });
      } finally {
        clearTimeout(timer);
      }
    },
    async executeVoiceTurn(input) {
      const started = Date.now();
      const deadlineMs = input.deadlineMs ?? DEFAULT_VOICE_DEADLINE_MS;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, deadlineMs + 1000));
      try {
        const res = await fetch(
          `${baseUrl}/internal/workspaces/${encodeURIComponent(input.workspaceId)}/voice/conversations/${encodeURIComponent(input.conversationId)}/turns`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${internalToken}`,
              "idempotency-key": input.idempotencyKey,
              "x-request-id": input.requestId,
            },
            body: JSON.stringify({
              text: input.text,
              call_id: input.callId,
              deadline_ms: deadlineMs,
            }),
            signal: controller.signal,
          },
        );
        if (!res.ok) {
          const body = await res.text();
          throw new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: `Runtime voice turn failed (${res.status}): ${body.slice(0, 200)}`,
          });
        }
        const json = (await res.json()) as {
          turn: {
            deduplicated: boolean;
            conversation_id: string;
            agent_id: string;
            agent_version_id: string;
            assistant_message: { text: string };
          };
        };
        return {
          assistant_text: json.turn.assistant_message.text,
          agent_id: json.turn.agent_id,
          agent_version_id: json.turn.agent_version_id,
          conversation_id: json.turn.conversation_id,
          latency_ms: Date.now() - started,
          deduplicated: json.turn.deduplicated,
        };
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: err instanceof Error ? err.message : "Runtime voice turn failed",
        });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** Deterministic runtime for unit tests. */
export function createFakeRuntimeClient(
  reply = "agent says hi",
  latencyMs = 5,
): RuntimeClient {
  return {
    async executeWidgetTurn(input) {
      return {
        assistant_text: reply,
        agent_id: "agent-fake",
        agent_version_id: "version-fake",
        conversation_id: input.conversationId,
        latency_ms: latencyMs,
        deduplicated: false,
        assistant_message: { id: "asst-fake", text: reply, seq: 2 },
        user_message: { id: "user-fake", text: input.text, seq: 1 },
      };
    },
    async executeVoiceTurn(input) {
      return {
        assistant_text: reply,
        agent_id: "agent-fake",
        agent_version_id: "version-fake",
        conversation_id: input.conversationId,
        latency_ms: latencyMs,
        deduplicated: false,
      };
    },
  };
}
