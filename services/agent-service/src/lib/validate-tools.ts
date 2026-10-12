import type { AgentToolDefinition } from "@quickstart/contracts";
import {
  MAX_TOOL_TIMEOUT_MS,
  MAX_TOOLS_PER_AGENT,
  DEFAULT_TOOL_TIMEOUT_MS,
} from "@quickstart/contracts";
import { AppError, ErrorCode } from "@quickstart/errors";

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "127.0.0.1" || h.startsWith("127.")) return true;
  if (h.startsWith("10.") || h.startsWith("192.168.") || h === "0.0.0.0") return true;
  if (h.startsWith("169.254.")) return true;
  const parts = h.split(".");
  if (parts[0] === "172") {
    const second = Number(parts[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function validateHttpTool(tool: AgentToolDefinition & { type: "http" }): void {
  if (!tool.base_url?.trim()) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "http tool requires base_url",
    });
  }
  let url: URL;
  try {
    url = new URL(tool.base_url);
  } catch {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "http tool base_url must be a valid URL",
    });
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "http tool base_url must be http or https",
    });
  }
  const host = url.hostname;
  if (isPrivateHost(host)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "http tool host is not allow-listed for production",
    });
  }
  if (!tool.allowed_hosts?.length) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "http tool requires allowed_hosts",
    });
  }
  const allowed = tool.allowed_hosts.map((h) => h.toLowerCase());
  if (!allowed.includes(host.toLowerCase())) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "base_url host must appear in allowed_hosts",
    });
  }
  for (const ah of tool.allowed_hosts) {
    if (isPrivateHost(ah)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "allowed_hosts may not include private hosts",
      });
    }
  }
}

function validateMcpTool(tool: AgentToolDefinition & { type: "mcp" }): void {
  if (!tool.server_url?.trim()) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "mcp tool requires server_url",
    });
  }
  let url: URL;
  try {
    url = new URL(tool.server_url);
  } catch {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "mcp server_url must be a valid URL",
    });
  }
  if (isPrivateHost(url.hostname)) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "mcp server_url host is not allow-listed",
    });
  }
  if (!tool.allowed_tool_names?.length) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: "mcp tool requires allowed_tool_names",
    });
  }
}

export function validateAgentTools(tools: AgentToolDefinition[]): AgentToolDefinition[] {
  if (!Array.isArray(tools)) {
    throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "tools must be an array" });
  }
  if (tools.length > MAX_TOOLS_PER_AGENT) {
    throw new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: `At most ${MAX_TOOLS_PER_AGENT} tools per agent`,
    });
  }
  const names = new Set<string>();
  const normalized: AgentToolDefinition[] = [];
  for (const raw of tools) {
    if (!raw?.id?.trim() || !raw?.name?.trim() || !raw?.description?.trim()) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "Each tool requires id, name, and description",
      });
    }
    const name = raw.name.trim();
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(name)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "tool name must be alphanumeric with underscores",
      });
    }
    if (names.has(name)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `duplicate tool name: ${name}`,
      });
    }
    names.add(name);
    const timeout = raw.timeout_ms ?? DEFAULT_TOOL_TIMEOUT_MS;
    if (timeout < 1000 || timeout > MAX_TOOL_TIMEOUT_MS) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `tool timeout_ms must be between 1000 and ${MAX_TOOL_TIMEOUT_MS}`,
      });
    }
    const tool = {
      ...raw,
      name,
      id: raw.id.trim(),
      description: raw.description.trim(),
      timeout_ms: timeout,
    };
    if (tool.type === "http") {
      validateHttpTool(tool);
    } else if (tool.type === "builtin_web") {
      if (tool.action !== "scrape" && tool.action !== "search") {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "builtin_web action must be scrape or search",
        });
      }
    } else if (tool.type === "builtin_leads") {
      if (!["start", "status", "results", "cancel"].includes(tool.action)) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: "Invalid builtin_leads action",
        });
      }
    } else if (tool.type === "mcp") {
      validateMcpTool(tool);
    } else {
      throw new AppError({ code: ErrorCode.VALIDATION_FAILED, message: "unknown tool type" });
    }
    normalized.push(tool);
  }
  return normalized;
}
