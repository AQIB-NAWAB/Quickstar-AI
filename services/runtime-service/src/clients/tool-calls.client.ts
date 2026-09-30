import type { ToolCallRecord, UpsertToolCallBody } from "@quickstart/contracts";
import { fetchWithPolicy } from "@quickstart/utilities";

export class ToolCallsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number = 10_000,
  ) {}

  async upsert(
    workspaceId: string,
    conversationId: string,
    body: UpsertToolCallBody,
    authHeaders: Record<string, string>,
  ): Promise<{ record: ToolCallRecord; created: boolean }> {
    const url = `${this.baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/tool-calls`;
    const res = await fetchWithPolicy(
      url,
      {
        method: "PUT",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );
    const json = (await res.json()) as {
      tool_call: ToolCallRecord;
      created?: boolean;
    };
    return { record: json.tool_call, created: json.created ?? false };
  }

  async listByTurn(
    workspaceId: string,
    conversationId: string,
    turnIdempotencyKey: string,
    authHeaders: Record<string, string>,
  ): Promise<ToolCallRecord[]> {
    const params = new URLSearchParams({ turn_idempotency_key: turnIdempotencyKey });
    const url = `${this.baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/tool-calls?${params}`;
    const res = await fetchWithPolicy(
      url,
      {
        method: "GET",
        headers: { ...authHeaders, accept: "application/json" },
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );
    const json = (await res.json()) as { tool_calls?: ToolCallRecord[] };
    return json.tool_calls ?? [];
  }
}
