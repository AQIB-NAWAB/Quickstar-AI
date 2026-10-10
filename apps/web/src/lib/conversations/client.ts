import type { Conversation, ConversationState, Message } from "./types";

type ApiError = { error: { code: string; message: string; request_id?: string } };

async function bff<T>(path: string, init?: RequestInit): Promise<{ data?: T; error?: ApiError["error"] }> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T | ApiError;
  if (!res.ok) {
    const err = body as ApiError;
    return {
      error: err.error ?? {
        code: `HTTP_${res.status}`,
        message: res.statusText || "Request failed",
      },
    };
  }
  return { data: body as T };
}

export async function listConversations(
  workspaceId: string,
  options?: { state?: ConversationState; limit?: number },
): Promise<{ conversations?: Conversation[]; error?: ApiError["error"] }> {
  const params = new URLSearchParams();
  if (options?.state) {
    params.set("state", options.state);
  }
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }
  const q = params.toString();
  const { data, error } = await bff<{ conversations: Conversation[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/conversations${q ? `?${q}` : ""}`,
  );
  return error ? { error } : { conversations: data!.conversations };
}

export async function getConversation(
  workspaceId: string,
  conversationId: string,
): Promise<{ conversation?: Conversation; error?: ApiError["error"] }> {
  const { data, error } = await bff<{ conversation: Conversation }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}`,
  );
  return error ? { error } : { conversation: data!.conversation };
}

export async function listMessages(
  workspaceId: string,
  conversationId: string,
  options?: { afterSeq?: number; limit?: number },
): Promise<{ messages?: Message[]; error?: ApiError["error"] }> {
  const params = new URLSearchParams();
  if (options?.afterSeq !== undefined) {
    params.set("after_seq", String(options.afterSeq));
  }
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }
  const q = params.toString();
  const { data, error } = await bff<{ messages: Message[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/messages${q ? `?${q}` : ""}`,
  );
  return error ? { error } : { messages: data!.messages };
}

export async function takeConversation(
  workspaceId: string,
  conversationId: string,
): Promise<{ conversation?: Conversation; error?: ApiError["error"] }> {
  const { data, error } = await bff<{ conversation: Conversation }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/take`,
    { method: "POST" },
  );
  return error ? { error } : { conversation: data!.conversation };
}

export async function releaseConversation(
  workspaceId: string,
  conversationId: string,
): Promise<{ conversation?: Conversation; error?: ApiError["error"] }> {
  const { data, error } = await bff<{ conversation: Conversation }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/release`,
    { method: "POST" },
  );
  return error ? { error } : { conversation: data!.conversation };
}

export async function sendHumanMessage(
  workspaceId: string,
  conversationId: string,
  text: string,
  idempotencyKey: string,
): Promise<{ message?: Message; error?: ApiError["error"] }> {
  const { data, error } = await bff<{ message: Message }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        text,
        sender_type: "human",
        idempotency_key: idempotencyKey,
      }),
    },
  );
  return error ? { error } : { message: data!.message };
}
