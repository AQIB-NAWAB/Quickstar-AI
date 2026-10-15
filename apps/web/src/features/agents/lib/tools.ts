import type { CustomToolItem } from "@/features/settings/lib/types";
import type { AgentToolDefinition, ToolParameterSchema } from "./types";

/**
 * Converts a workspace custom tool into an attachable agent tool definition.
 * Agents store the inlined definition, so published snapshots stay self-contained.
 */
export function customToolToAgentTool(tool: CustomToolItem): AgentToolDefinition {
  const config = tool.config ?? {};
  const parameters = (config.parameters as ToolParameterSchema | undefined) ?? undefined;
  const base = {
    id: `custom:${tool.id}:${tool.name}`,
    name: tool.name,
    description: tool.description || tool.name,
    ...(parameters ? { parameters } : {}),
    ...(typeof config.timeout_ms === "number" ? { timeout_ms: config.timeout_ms } : {}),
    ...(config.idempotent !== undefined ? { idempotent: Boolean(config.idempotent) } : {}),
  };
  if (tool.kind === "http") {
    return {
      ...base,
      type: "http",
      method: (config.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE") ?? "GET",
      base_url: String(config.base_url ?? ""),
      allowed_hosts: (config.allowed_hosts as string[]) ?? [],
      ...(config.path_template ? { path_template: String(config.path_template) } : {}),
      ...(config.headers && Object.keys(config.headers as Record<string, string>).length > 0
        ? { headers: config.headers as Record<string, string> }
        : {}),
      ...(config.auth
        ? { auth: config.auth as { type: "bearer_secret"; secret_name: string } }
        : {}),
    };
  }
  return {
    ...base,
    type: "mcp",
    server_url: String(config.server_url ?? ""),
    allowed_tool_names: (config.allowed_tool_names as string[]) ?? [],
  };
}

export const BUILTIN_TOOLS: AgentToolDefinition[] = [
  {
    id: "builtin:web_scrape",
    name: "web_scrape",
    description: "Scrape the text content of a public web page given its URL",
    type: "builtin_web",
    action: "scrape",
    parameters: {
      type: "object",
      properties: { url: { type: "string", description: "The public page URL to scrape" } },
      required: ["url"],
    },
  },
  {
    id: "builtin:web_search",
    name: "web_search",
    description: "Search the web for current public information",
    type: "builtin_web",
    action: "search",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "The search query" } },
      required: ["query"],
    },
  },
  {
    id: "builtin:leads_start",
    name: "leads_start_research",
    description: "Start a business lead research run for a category and location",
    type: "builtin_leads",
    action: "start",
  },
  {
    id: "builtin:leads_status",
    name: "leads_run_status",
    description: "Check the status of a lead research run",
    type: "builtin_leads",
    action: "status",
    parameters: {
      type: "object",
      properties: { run_id: { type: "string", description: "The lead run id" } },
      required: ["run_id"],
    },
  },
  {
    id: "builtin:leads_results",
    name: "leads_run_results",
    description: "Fetch accepted leads from a completed research run",
    type: "builtin_leads",
    action: "results",
    parameters: {
      type: "object",
      properties: { run_id: { type: "string", description: "The lead run id" } },
      required: ["run_id"],
    },
  },
  {
    id: "builtin:leads_cancel",
    name: "leads_cancel_run",
    description: "Cancel a running lead research job",
    type: "builtin_leads",
    action: "cancel",
    parameters: {
      type: "object",
      properties: { run_id: { type: "string", description: "The lead run id" } },
      required: ["run_id"],
    },
  },
];
