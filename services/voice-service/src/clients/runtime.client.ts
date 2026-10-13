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

export type RuntimeClient = {
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
