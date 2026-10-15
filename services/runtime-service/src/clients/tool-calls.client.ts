import type { ToolCallRecord, UpsertToolCallBody } from "@quickstart/contracts";
import { fetchWithPolicy } from "@quickstart/utilities";

export class ToolCallsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number = 10_000,
    private readonly internalToken?: string,
  ) {}

  /**
   * Staff turns pass the caller's JWT and use the workspace route. Widget turns
   * have no staff JWT, so the internal widget route (guarded by the runtime's
   * internal token) records the same audit rows.
   */
  private resolve(
    workspaceId: string,
    conversationId: string,
    authHeaders: Record<string, string>,
  ) {
    const staff = Boolean(authHeaders.authorization);
    const ws = encodeURIComponent(workspaceId);
    const conv = encodeURIComponent(conversationId);
    if (staff) {
      return {
        url: `${this.baseUrl}/v1/workspaces/${ws}/conversations/${conv}/tool-calls`,
        headers: authHeaders,
      };
    }
    if (!this.internalToken) {
      throw new Error("ToolCallsClient requires an internal token for widget tool-call audit");
    }
    return {
      url: `${this.baseUrl}/internal/workspaces/${ws}/widget/conversations/${conv}/tool-calls`,
      headers: { authorization: `Bearer ${this.internalToken}` },
    };
  }

  async upsert(
    workspaceId: string,
    conversationId: string,
    body: UpsertToolCallBody,
    authHeaders: Record<string, string>,
  ): Promise<{ record: ToolCallRecord; created: boolean }> {
    const { url, headers } = this.resolve(workspaceId, conversationId, authHeaders);
    const res = await fetchWithPolicy(
      url,
      {
        method: "PUT",
        headers: {
          ...headers,
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
    const { url, headers } = this.resolve(workspaceId, conversationId, authHeaders);
    const separator = url.includes("?") ? "&" : "?";
    const params = `turn_idempotency_key=${encodeURIComponent(turnIdempotencyKey)}`;
    const res = await fetchWithPolicy(
      `${url}${separator}${params}`,
      {
        method: "GET",
        headers: { ...headers, accept: "application/json" },
      },
      { timeoutMs: this.timeoutMs, maxRetries: 0 },
    );
    const json = (await res.json()) as { tool_calls?: ToolCallRecord[] };
    return json.tool_calls ?? [];
  }
}
