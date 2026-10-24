import { AppError, ErrorCode } from "@quickstart/errors";

export type ConversationClient = {
  createWidgetConversation(input: {
    workspaceId: string;
    agentId?: string | null;
  }): Promise<{ id: string }>;
};

export function createHttpConversationClient(
  baseUrl: string,
  internalToken: string,
  timeoutMs = 10_000,
): ConversationClient {
  const base = baseUrl.replace(/\/$/, "");
  return {
    async createWidgetConversation(input) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(
          `${base}/internal/workspaces/${encodeURIComponent(input.workspaceId)}/widget/conversations`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${internalToken}`,
            },
            body: JSON.stringify({ agent_id: input.agentId ?? undefined }),
            signal: controller.signal,
          },
        );
        const text = await res.text();
        if (!res.ok) {
          throw new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: `Conversation create failed (${res.status}): ${text.slice(0, 200)}`,
          });
        }
        const json = JSON.parse(text) as { conversation?: { id?: string } };
        if (!json.conversation?.id) {
          throw new AppError({
            code: ErrorCode.UPSTREAM_UNAVAILABLE,
            message: "Conversation create returned no id",
          });
        }
        return { id: json.conversation.id };
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError({
          code: ErrorCode.UPSTREAM_TIMEOUT,
          message: err instanceof Error ? err.message : "Conversation create failed",
        });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function createFakeConversationClient(prefix = "conv"): ConversationClient {
  let counter = 1;
  return {
    async createWidgetConversation(input) {
      void input;
      return { id: `${prefix}-${counter++}` };
    },
  };
}
