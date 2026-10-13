import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";

export type EvalTurnResponse = {
  assistant_text: string;
  agent_version_id: string;
  deduplicated?: boolean;
};

export class RuntimeEvalClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
    private readonly timeoutMs: number,
  ) {}

  async executeEvalTurn(input: {
    workspaceId: string;
    agentId: string;
    agentVersionId: string;
    message: string;
    idempotencyKey: string;
    requestId: string;
    deadlineMs?: number;
  }): Promise<EvalTurnResponse> {
    const url = `${this.baseUrl}/internal/v1/workspaces/${encodeURIComponent(input.workspaceId)}/eval/turns`;
    const res = await fetchWithPolicy(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.internalToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-request-id": input.requestId,
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          agent_id: input.agentId,
          agent_version_id: input.agentVersionId,
          message: input.message,
          idempotency_key: input.idempotencyKey,
          deadline_ms: input.deadlineMs,
        }),
      },
      {
        timeoutMs: this.timeoutMs,
        maxRetries: 1,
        hasIdempotencyKey: true,
      },
    );

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: body?.error?.message ?? `Runtime eval turn failed: ${res.status}`,
      });
    }

    const data = (await res.json()) as {
      turn: { assistant_text?: string; assistant_message?: { text?: string }; agent_version_id: string; deduplicated?: boolean };
    };
    const text =
      data.turn.assistant_text ?? data.turn.assistant_message?.text ?? "";
    return {
      assistant_text: text,
      agent_version_id: data.turn.agent_version_id,
      deduplicated: data.turn.deduplicated,
    };
  }
}
