import type {
  Agent,
  AgentChannels,
  AgentToolDefinition,
  AgentVersion,
  AgentVersionDiff,
  ApiError,
} from "./types";

type BffResponse<T> = { data?: T; error?: ApiError; status: number };

async function bff<T>(path: string, init?: RequestInit): Promise<BffResponse<T>> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as {
    agent?: Agent;
    agents?: Agent[];
    version?: AgentVersion;
    versions?: AgentVersion[];
    error?: ApiError;
    [key: string]: unknown;
  };

  if (!res.ok) {
    return {
      status: res.status,
      error: body?.error ?? {
        code: `HTTP_${res.status}`,
        message: res.statusText || "Request failed",
      },
    };
  }

  return { status: res.status, data: body as unknown as T };
}

export async function listAgents(
  workspaceId: string,
): Promise<{ agents?: Agent[]; error?: ApiError }> {
  const { data, error } = await bff<{ agents: Agent[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/agents`,
  );
  return error ? { error } : { agents: data?.agents ?? [] };
}

export async function getAgent(
  workspaceId: string,
  agentId: string,
): Promise<{ agent?: Agent; error?: ApiError }> {
  const { data, error } = await bff<{ agent: Agent }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}`,
  );
  return error ? { error } : { agent: data?.agent };
}

export type CreateAgentPayload = {
  name: string;
  description?: string | null;
  instructions?: string;
  environment?: string;
  model_settings?: Record<string, unknown>;
  channels?: Partial<AgentChannels>;
  tools?: AgentToolDefinition[];
};

export async function createAgent(
  workspaceId: string,
  payload: CreateAgentPayload,
): Promise<{ agent?: Agent; error?: ApiError }> {
  const { data, error } = await bff<{ agent: Agent }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/agents`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return error ? { error } : { agent: data?.agent };
}

export type UpdateAgentPayload = {
  name?: string;
  description?: string | null;
  instructions?: string;
  environment?: string;
  model_settings?: Record<string, unknown>;
  channels?: Partial<AgentChannels>;
  tools?: AgentToolDefinition[];
  expected_version: number;
};

export async function updateAgent(
  workspaceId: string,
  agentId: string,
  payload: UpdateAgentPayload,
): Promise<{ agent?: Agent; error?: ApiError; isConflict?: boolean }> {
  const result = await bff<{ agent: Agent }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
  if (result.error) {
    return {
      error: result.error,
      isConflict: result.status === 409 || result.error.code === "CONFLICT",
    };
  }
  return { agent: result.data?.agent };
}

export async function deleteAgent(
  workspaceId: string,
  agentId: string,
): Promise<{ success: boolean; error?: ApiError }> {
  const { error } = await bff<{ deleted: boolean }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}`,
    {
      method: "DELETE",
    },
  );
  return error ? { success: false, error } : { success: true };
}

export async function publishAgent(
  workspaceId: string,
  agentId: string,
  baseVersion: number,
): Promise<{ version?: AgentVersion; agent?: Agent; error?: ApiError }> {
  const { data, error } = await bff<{ version: AgentVersion; agent: Agent }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/publish`,
    {
      method: "POST",
      body: JSON.stringify({ base_version: baseVersion }),
    },
  );
  return error ? { error } : { version: data?.version, agent: data?.agent };
}

export async function rollbackAgent(
  workspaceId: string,
  agentId: string,
  versionId: string,
): Promise<{ version?: AgentVersion; agent?: Agent; error?: ApiError }> {
  const { data, error } = await bff<{ version: AgentVersion; agent: Agent }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/rollback`,
    {
      method: "POST",
      body: JSON.stringify({ version_id: versionId }),
    },
  );
  return error ? { error } : { version: data?.version, agent: data?.agent };
}

export async function listVersions(
  workspaceId: string,
  agentId: string,
): Promise<{ versions?: AgentVersion[]; error?: ApiError }> {
  const { data, error } = await bff<{ versions: AgentVersion[] }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/versions`,
  );
  return error ? { error } : { versions: data?.versions ?? [] };
}

export async function diffVersions(
  workspaceId: string,
  agentId: string,
  leftId: string,
  rightId: string,
): Promise<{ diff?: AgentVersionDiff; error?: ApiError }> {
  const { data, error } = await bff<AgentVersionDiff>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/versions/${encodeURIComponent(leftId)}/diff/${encodeURIComponent(rightId)}`,
  );
  return error ? { error } : { diff: data };
}

export async function createTestConversation(
  workspaceId: string,
  agentId: string,
): Promise<{ conversationId?: string; error?: ApiError }> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: agentId }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    conversation?: { id: string };
    error?: ApiError;
  };
  if (!res.ok) {
    return {
      error: body.error ?? {
        code: `HTTP_${res.status}`,
        message: "Failed to create test conversation",
      },
    };
  }
  return { conversationId: body.conversation?.id };
}

export async function executeTestTurn(
  workspaceId: string,
  conversationId: string,
  message: string,
  onToken?: (delta: string) => void,
): Promise<{ assistantText?: string; error?: ApiError }> {
  const res = await fetch(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/conversations/${encodeURIComponent(conversationId)}/turns`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        message,
        idempotency_key: `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      }),
    },
  );
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !res.body) {
    const body = (await res.json().catch(() => ({}))) as {
      assistant_message?: { text: string };
      error?: ApiError;
    };
    if (!res.ok) {
      return {
        error: body.error ?? {
          code: `HTTP_${res.status}`,
          message: "Failed to run test turn",
        },
      };
    }
    return { assistantText: body.assistant_message?.text };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantText = "";
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
      const data = JSON.parse(dataLine) as {
        delta?: string;
        message?: string;
        turn?: { assistant_message?: { text?: string } };
      };
      if (eventName === "token" && data.delta) {
        assistantText += data.delta;
        onToken?.(data.delta);
      } else if (eventName === "done" && data.turn?.assistant_message?.text && !assistantText) {
        assistantText = data.turn.assistant_message.text;
      } else if (eventName === "error") {
        return {
          error: { code: "STREAM_ERROR", message: data.message || "Turn stream failed" },
          assistantText,
        };
      }
    }
  }
  if (!res.ok && !assistantText) {
    return { error: { code: `HTTP_${res.status}`, message: "Failed to run test turn" } };
  }
  return { assistantText };
}
