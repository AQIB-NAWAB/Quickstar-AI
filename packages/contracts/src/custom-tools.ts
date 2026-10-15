/** Workspace custom tool registry (Feature 26) — admin-authored, attachable to agents. */

import type {
  AgentHttpToolDefinition,
  AgentMcpToolDefinition,
  AgentToolDefinition,
  ToolParameterSchema,
} from "./agent-tools.js";

export const MAX_CUSTOM_TOOLS_PER_WORKSPACE = 50;

export type CustomToolKind = "http" | "mcp";

export type CustomToolHttpConfig = {
  method: AgentHttpToolDefinition["method"];
  base_url: string;
  allowed_hosts: string[];
  path_template?: string;
  headers?: Record<string, string>;
  auth?: AgentHttpToolDefinition["auth"];
  timeout_ms?: number;
  idempotent?: boolean;
  /** JSON schema for the arguments the model may pass. */
  parameters?: ToolParameterSchema;
};

export type CustomToolMcpConfig = {
  server_url: string;
  allowed_tool_names: string[];
  /** JSON schema for the arguments the model may pass. */
  parameters?: ToolParameterSchema;
};

export type CustomToolConfig = CustomToolHttpConfig | CustomToolMcpConfig;

export type CustomTool = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  kind: CustomToolKind;
  config: CustomToolConfig;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CustomToolInput = {
  name: string;
  description?: string;
  kind: CustomToolKind;
  config: CustomToolConfig;
};

export type CustomToolUpdate = Partial<CustomToolInput>;

/**
 * Converts a registry row into an attachable agent tool definition.
 * Agents store the inlined definition, so published snapshots stay self-contained
 * even if the workspace tool is later edited or deleted.
 */
export function toAgentToolDefinition(
  tool: Pick<CustomTool, "id" | "name" | "description" | "kind" | "config">,
): AgentToolDefinition {
  const httpConfig = tool.kind === "http" ? (tool.config as CustomToolHttpConfig) : null;
  const config = tool.config as CustomToolHttpConfig | CustomToolMcpConfig;
  const parameters = config.parameters;
  const base = {
    id: `custom:${tool.id}:${tool.name}`,
    name: tool.name,
    description: tool.description,
    ...(parameters ? { parameters } : {}),
    ...(httpConfig && httpConfig.timeout_ms ? { timeout_ms: httpConfig.timeout_ms } : {}),
    ...(httpConfig && httpConfig.idempotent !== undefined
      ? { idempotent: httpConfig.idempotent }
      : {}),
  };
  if (tool.kind === "http") {
    const http = httpConfig as CustomToolHttpConfig;
    return {
      ...base,
      type: "http",
      method: http.method,
      base_url: http.base_url,
      allowed_hosts: http.allowed_hosts,
      ...(http.path_template ? { path_template: http.path_template } : {}),
      ...(http.headers && Object.keys(http.headers).length > 0 ? { headers: http.headers } : {}),
      ...(http.auth ? { auth: http.auth } : {}),
    } satisfies AgentHttpToolDefinition;
  }
  const mcp = tool.config as CustomToolMcpConfig;
  return {
    ...base,
    type: "mcp",
    server_url: mcp.server_url,
    allowed_tool_names: mcp.allowed_tool_names,
  } satisfies AgentMcpToolDefinition;
}
