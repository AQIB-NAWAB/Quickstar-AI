import type { AgentMcpToolDefinition } from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";
import type { ToolExecutionResult } from "./tool-executor.js";

/** Minimal MCP tools/call over HTTP JSON endpoint (v1 test server). */
export class McpToolRunner {
  constructor(private readonly defaultTimeoutMs: number) {}

  async run(
    tool: AgentMcpToolDefinition,
    args: Record<string, unknown>,
    ctx: { timeoutMs: number; requestId: string },
  ): Promise<ToolExecutionResult> {
    const mcpToolName = String(args.mcp_tool_name ?? tool.allowed_tool_names[0] ?? "");
    if (!tool.allowed_tool_names.includes(mcpToolName)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "MCP tool name is not allow-listed",
      });
    }
    const url = new URL(tool.server_url);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      // allowed for tests only when explicitly configured in tool definition
    } else if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Invalid MCP server URL",
      });
    }

    const { fetchWithPolicy } = await import("@quickstart/utilities");
    const res = await fetchWithPolicy(
      tool.server_url,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ctx.requestId,
          method: "tools/call",
          params: { name: mcpToolName, arguments: args },
        }),
      },
      { timeoutMs: ctx.timeoutMs ?? this.defaultTimeoutMs, maxRetries: 0 },
    ).catch(() => {
      throw new AppError({
        code: ErrorCode.UPSTREAM_TIMEOUT,
        message: "MCP tool timed out",
      });
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        content: text.slice(0, 2000),
        errorCode: "MCP_HTTP_ERROR",
        status: "failed",
      };
    }
    return { ok: true, content: text.slice(0, 8000), status: "succeeded" };
  }
}
