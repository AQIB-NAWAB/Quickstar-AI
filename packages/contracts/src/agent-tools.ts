/** Agent tool definitions (Feature 15) — frozen in published version snapshot. */

export type ToolParameterProperty = {
  type: string;
  description?: string;
  items?: { type: string };
  enum?: Array<string | number | boolean>;
};

export type ToolParameterSchema = {
  type: "object";
  properties?: Record<string, ToolParameterProperty>;
  required?: string[];
};

export type AgentToolDefinitionBase = {
  id: string;
  name: string;
  description: string;
  parameters?: ToolParameterSchema;
  timeout_ms?: number;
  /** When false, timeout → unknown and no automatic retry. */
  idempotent?: boolean;
};

export type AgentHttpToolAuth = {
  type: "bearer_secret";
  /** Name of a workspace secret (secrets vault). Resolved by the runtime at execution time. */
  secret_name: string;
};

export type AgentHttpToolDefinition = AgentToolDefinitionBase & {
  type: "http";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  base_url: string;
  allowed_hosts: string[];
  path_template?: string;
  /** Static headers sent with every call. `authorization`/`x-api-key` are rejected — use `auth`. */
  headers?: Record<string, string>;
  auth?: AgentHttpToolAuth;
};

export type AgentBuiltinWebToolDefinition = AgentToolDefinitionBase & {
  type: "builtin_web";
  action: "scrape" | "search";
};

export type AgentMcpToolDefinition = AgentToolDefinitionBase & {
  type: "mcp";
  server_url: string;
  allowed_tool_names: string[];
};

export type AgentBuiltinLeadToolDefinition = AgentToolDefinitionBase & {
  type: "builtin_leads";
  action: "start" | "status" | "results" | "cancel";
};

export type AgentToolDefinition =
  | AgentBuiltinLeadToolDefinition
  | AgentHttpToolDefinition
  | AgentBuiltinWebToolDefinition
  | AgentMcpToolDefinition;

export const MAX_TOOLS_PER_AGENT = 20;
export const MAX_TOOL_ROUNDS_PER_TURN = 5;
export const DEFAULT_TOOL_TIMEOUT_MS = 30_000;
export const MAX_TOOL_TIMEOUT_MS = 60_000;
export const MAX_TOOL_ARGUMENT_BYTES = 16_384;
