import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";

export type ConversationInfo = {
  id: string;
  workspace_id: string;
  agent_id: string | null;
  last_seq: number;
};

export type MessageInfo = {
  id: string;
  workspace_id: string;
  conversation_id: string;
  seq: number;
  sender_type: string;
  sender_id: string;
  text: string;
  idempotency_key: string;
  created_at: string;
};

export type AppendMessageResult = {
  message: MessageInfo;
  deduplicated?: boolean;
};

export class ConversationClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number = 5000,
  ) {}

  async getConversation(
    workspaceId: string,
    conversationId: string,
    headers: Record<string, string>,
  ): Promise<ConversationInfo> {
    const url = `${this.baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}`;
    const res = await fetchWithPolicy(
      url,
      {
        method: "GET",
        headers: {
          ...headers,
          Accept: "application/json",
        },
      },
      { timeoutMs: this.timeoutMs, maxRetries: 1 },
    );

    if (res.status === 404) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Conversation not found in workspace",
      });
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: body?.error?.message ?? `Conversation service failed with status ${res.status}`,
      });
    }

    const data = (await res.json()) as { conversation: ConversationInfo };
    return data.conversation;
  }

  async appendMessage(
    workspaceId: string,
    conversationId: string,
    params: {
      text?: string;
      idempotency_key?: string;
      sender_type?: string;
      sender_id?: string;
      metadata?: Record<string, unknown> | null;
    },
    headers: Record<string, string>,
  ): Promise<AppendMessageResult> {
    const url = `${this.baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/messages`;
    const res = await fetchWithPolicy(
      url,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(params),
      },
      {
        timeoutMs: this.timeoutMs,
        maxRetries: 1,
        hasIdempotencyKey: Boolean(params.idempotency_key),
      },
    );

    if (res.status === 404) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Conversation not found in workspace",
      });
    }

    if (!res.ok && res.status !== 200 && res.status !== 201) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: body?.error?.message ?? `Failed to append message: status ${res.status}`,
      });
    }

    const data = (await res.json()) as { message: MessageInfo; deduplicated?: boolean };
    return {
      message: data.message,
      deduplicated: Boolean(data.deduplicated || res.status === 200),
    };
  }

  async listMessages(
    workspaceId: string,
    conversationId: string,
    headers: Record<string, string>,
    limit: number = 50,
  ): Promise<MessageInfo[]> {
    const url = `${this.baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}`;
    const res = await fetchWithPolicy(
      url,
      {
        method: "GET",
        headers: {
          ...headers,
          Accept: "application/json",
        },
      },
      { timeoutMs: this.timeoutMs, maxRetries: 1 },
    );

    if (res.status === 404) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: "Conversation not found in workspace",
      });
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: body?.error?.message ?? `Failed to list messages: status ${res.status}`,
      });
    }

    const data = (await res.json()) as { messages: MessageInfo[] };
    return data.messages ?? [];
  }
}
