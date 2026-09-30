import type { AgentToolDefinition } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";

export type AgentInfo = {
  id: string;
  workspace_id: string;
  name: string;
  production_version_id: string | null;
  instructions: string;
  model_settings?: Record<string, unknown>;
};

export type AgentVersionInfo = {
  id: string;
  workspace_id: string;
  agent_id: string;
  release_number: number;
  snapshot: {
    name: string;
    instructions: string;
    model_settings: Record<string, unknown>;
    channels?: { chat?: boolean; voice?: boolean };
    tools?: AgentToolDefinition[];
  };
};

export class AgentClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number = 5000,
  ) {}

  async getAgent(workspaceId: string, agentId: string, headers: Record<string, string>): Promise<AgentInfo> {
    const url = `${this.baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}`;
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
        message: "Agent not found in workspace",
      });
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: body?.error?.message ?? `Agent service failed with status ${res.status}`,
      });
    }

    const data = (await res.json()) as { agent: AgentInfo };
    return data.agent;
  }

  async getVersion(
    workspaceId: string,
    agentId: string,
    versionId: string,
    headers: Record<string, string>,
  ): Promise<AgentVersionInfo> {
    const url = `${this.baseUrl}/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/versions/${encodeURIComponent(versionId)}`;
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
        message: "Agent version not found",
      });
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new AppError({
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: body?.error?.message ?? `Agent service failed with status ${res.status}`,
      });
    }

    const data = (await res.json()) as { version: AgentVersionInfo };
    return data.version;
  }
}
