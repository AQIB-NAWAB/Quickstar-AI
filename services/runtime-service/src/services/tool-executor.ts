import type { AgentToolDefinition } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import { fetchWithPolicy } from "@quickstart/utilities";
import type { SecretsClient } from "../clients/secrets.client.js";
import type { WebFetchClient } from "../clients/web-fetch.client.js";
import type { McpToolRunner } from "./mcp-tool-runner.js";

export type ToolExecutionResult = {
  ok: boolean;
  content: string;
  errorCode?: string;
  status: "succeeded" | "failed" | "unknown";
};

function hostAllowed(url: URL, allowedHosts: string[]): boolean {
  const host = url.hostname.toLowerCase();
  return allowedHosts.some((h) => h.toLowerCase() === host);
}

export class ToolExecutor {
  constructor(
    private readonly webFetch?: WebFetchClient,
    private readonly mcpRunner?: McpToolRunner,
    private readonly secrets?: SecretsClient,
  ) {}

  async execute(
    tool: AgentToolDefinition,
    args: Record<string, unknown>,
    ctx: {
      workspaceId: string;
      requestId: string;
      toolCallKey: string;
      timeoutMs: number;
      authorization?: string;
    },
  ): Promise<ToolExecutionResult> {
    try {
      if (tool.type === "builtin_leads") {
        return await this.executeLeads(tool, args, ctx);
      }
      if (tool.type === "http") {
        return await this.executeHttp(tool, args, ctx);
      }
      if (tool.type === "builtin_web") {
        return await this.executeBuiltinWeb(tool, args, ctx);
      }
      if (tool.type === "mcp") {
        if (!this.mcpRunner) {
          return {
            ok: false,
            content: "MCP runner not configured",
            errorCode: "MCP_UNAVAILABLE",
            status: "failed",
          };
        }
        return await this.mcpRunner.run(tool, args, ctx);
      }
      return {
        ok: false,
        content: "Unknown tool type",
        errorCode: "VALIDATION_FAILED",
        status: "failed",
      };
    } catch (error) {
      if (error instanceof AppError && error.code === ErrorCode.RATE_LIMITED) {
        return {
          ok: false,
          content: error.message,
          errorCode: ErrorCode.RATE_LIMITED,
          status: "failed",
        };
      }
      if (error instanceof AppError) {
        return {
          ok: false,
          content: error.message,
          errorCode: error.code,
          status: error.code === ErrorCode.UPSTREAM_TIMEOUT ? "unknown" : "failed",
        };
      }
      const message = error instanceof Error ? error.message : "tool execution failed";
      return { ok: false, content: message, errorCode: "TOOL_FAILED", status: "unknown" };
    }
  }

  private async executeLeads(
    tool: AgentToolDefinition & { type: "builtin_leads" },
    args: Record<string, unknown>,
    ctx: {
      workspaceId: string;
      requestId: string;
      toolCallKey: string;
      timeoutMs: number;
      authorization?: string;
    },
  ): Promise<ToolExecutionResult> {
    if (!ctx.authorization)
      throw new AppError({
        code: ErrorCode.UNAUTHORIZED,
        message: "Lead tools require the caller's access token",
      });
    const base = (process.env.LEAD_GENERATION_URL ?? "http://127.0.0.1:3019").replace(/\/$/, "");
    const root = `${base}/v1/workspaces/${encodeURIComponent(ctx.workspaceId)}/lead-generation/runs`;
    const id = String(args.run_id ?? "");
    if (tool.action !== "start" && !/^[0-9a-f-]{36}$/i.test(id))
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "run_id required" });
    const url =
      tool.action === "start"
        ? root
        : `${root}/${encodeURIComponent(id)}${tool.action === "results" ? "/results" : tool.action === "cancel" ? "/cancel" : ""}`;
    const res = await fetchWithPolicy(
      url,
      {
        method: ["start", "cancel"].includes(tool.action) ? "POST" : "GET",
        headers: {
          authorization: ctx.authorization,
          "content-type": "application/json",
          "x-request-id": ctx.requestId,
          "idempotency-key": ctx.toolCallKey,
        },
        body: tool.action === "start" ? JSON.stringify(args) : undefined,
      },
      { timeoutMs: ctx.timeoutMs, maxRetries: 0 },
    );
    const content = (await res.text()).slice(0, 16000);
    return {
      ok: res.ok,
      content,
      status: res.ok ? "succeeded" : "failed",
      ...(res.ok ? {} : { errorCode: `LEAD_HTTP_${res.status}` }),
    };
  }

  private async executeHttp(
    tool: AgentToolDefinition & { type: "http" },
    args: Record<string, unknown>,
    ctx: { workspaceId: string; requestId: string; timeoutMs: number },
  ): Promise<ToolExecutionResult> {
    const path =
      typeof args.path === "string"
        ? args.path
        : tool.path_template
          ? tool.path_template.replace(/\{(\w+)\}/g, (_, key: string) => String(args[key] ?? ""))
          : "";
    const base = tool.base_url.replace(/\/$/, "");
    const url = new URL(path.startsWith("/") ? `${base}${path}` : `${base}/${path}`);
    if (!hostAllowed(url, tool.allowed_hosts)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "HTTP tool host is not on the allow-list",
      });
    }
    const method = tool.method ?? "GET";
    const body =
      method !== "GET" && method !== "DELETE" && args.body !== undefined
        ? JSON.stringify(args.body)
        : undefined;

    const headers: Record<string, string> = {
      ...(tool.headers ?? {}),
      ...(body ? { "content-type": "application/json" } : {}),
    };
    if (tool.auth?.type === "bearer_secret" && tool.auth.secret_name) {
      if (!this.secrets) {
        return {
          ok: false,
          content: "Secret-backed tool auth is not configured on the runtime",
          errorCode: "SECRETS_UNAVAILABLE",
          status: "failed",
        };
      }
      const value = await this.secrets.reveal(
        ctx.workspaceId,
        tool.auth.secret_name,
        ctx.requestId,
      );
      headers.authorization = `Bearer ${value}`;
    }

    const res = await fetchWithPolicy(
      url.toString(),
      {
        method,
        headers,
        body,
      },
      { timeoutMs: ctx.timeoutMs, maxRetries: 0 },
    ).catch(() => {
      throw new AppError({
        code: ErrorCode.UPSTREAM_TIMEOUT,
        message: "HTTP tool timed out",
      });
    });
    const text = await res.text();
    const snippet = text.slice(0, 8000);
    if (!res.ok) {
      return {
        ok: false,
        content: `HTTP ${res.status}: ${snippet}`,
        errorCode: "HTTP_TOOL_ERROR",
        status: "failed",
      };
    }
    return { ok: true, content: snippet, status: "succeeded" };
  }

  private async executeBuiltinWeb(
    tool: AgentToolDefinition & { type: "builtin_web" },
    args: Record<string, unknown>,
    ctx: { workspaceId: string; requestId: string; toolCallKey: string },
  ): Promise<ToolExecutionResult> {
    if (!this.webFetch) {
      return {
        ok: false,
        content: "Web fetch client not configured",
        errorCode: "WEB_FETCH_UNAVAILABLE",
        status: "failed",
      };
    }
    if (tool.action === "scrape") {
      const url = String(args.url ?? "");
      if (!url) {
        throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "url argument required" });
      }
      const result = await this.webFetch.scrape(
        ctx.workspaceId,
        ctx.requestId,
        url,
        ctx.toolCallKey,
      );
      return { ok: true, content: result.text.slice(0, 8000), status: "succeeded" };
    }
    const query = String(args.query ?? "");
    if (!query) {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "query argument required" });
    }
    const result = await this.webFetch.search(
      ctx.workspaceId,
      ctx.requestId,
      query,
      ctx.toolCallKey,
    );
    const joined = result.results.map((r) => r.snippet ?? r.title ?? "").join("\n");
    return { ok: true, content: joined.slice(0, 8000), status: "succeeded" };
  }
}
