"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import { createCustomTool, updateCustomTool } from "../lib/client";
import type { CustomToolItem, CustomToolKind } from "../lib/types";

const PARAM_TYPES = ["string", "number", "integer", "boolean", "array", "object"] as const;
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

type ParamRow = {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enumValues: string;
};

type HeaderRow = { key: string; value: string };

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Allowed hosts are bare hostnames; if the admin pastes a URL, keep only the hostname. */
function normalizeHost(entry: string): string {
  const trimmed = entry.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).hostname;
    } catch {
      return trimmed;
    }
  }
  return trimmed.replace(/\/.*$/, "");
}

interface CustomToolsModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  tool: CustomToolItem | null;
  secretNames: string[];
  onSaved: (tool: CustomToolItem) => void;
}

export function CustomToolsModal({
  open,
  onClose,
  workspaceId,
  tool,
  secretNames,
  onSaved,
}: CustomToolsModalProps) {
  const editing = Boolean(tool);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<CustomToolKind>("http");
  const [method, setMethod] = useState<string>("GET");
  const [baseUrl, setBaseUrl] = useState("");
  const [allowedHosts, setAllowedHosts] = useState("");
  const [pathTemplate, setPathTemplate] = useState("");
  const [headers, setHeaders] = useState<HeaderRow[]>([]);
  const [authSecret, setAuthSecret] = useState("");
  const [timeoutMs, setTimeoutMs] = useState("");
  const [idempotent, setIdempotent] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [allowedToolNames, setAllowedToolNames] = useState("");
  const [paramRows, setParamRows] = useState<ParamRow[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const config = tool?.config ?? {};
    setName(tool?.name ?? "");
    setDescription(tool?.description ?? "");
    setKind(tool?.kind ?? "http");
    setMethod((config.method as string) ?? "GET");
    setBaseUrl((config.base_url as string) ?? "");
    setAllowedHosts(((config.allowed_hosts as string[]) ?? []).join(", "));
    setPathTemplate((config.path_template as string) ?? "");
    const rawHeaders = (config.headers as Record<string, string>) ?? {};
    setHeaders(Object.entries(rawHeaders).map(([key, value]) => ({ key, value })));
    setAuthSecret((config.auth as { secret_name?: string })?.secret_name ?? "");
    setTimeoutMs(config.timeout_ms ? String(config.timeout_ms) : "");
    setIdempotent(Boolean(config.idempotent));
    setServerUrl((config.server_url as string) ?? "");
    setAllowedToolNames(((config.allowed_tool_names as string[]) ?? []).join(", "));
    const params = (tool?.config as { parameters?: Record<string, unknown> })?.parameters;
    const properties = (
      params as { properties?: Record<string, Record<string, unknown>> } | undefined
    )?.properties;
    const required = (params as { required?: string[] } | undefined)?.required ?? [];
    setParamRows(
      properties
        ? Object.entries(properties).map(([paramName, prop]) => ({
            name: paramName,
            type: String(prop.type ?? "string"),
            description: String(prop.description ?? ""),
            required: required.includes(paramName),
            enumValues: Array.isArray(prop.enum) ? prop.enum.map(String).join(", ") : "",
          }))
        : [],
    );
    setError(null);
  }, [open, tool]);

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  function buildConfig(): Record<string, unknown> {
    const parameters = buildParameters();
    if (kind === "http") {
      const httpConfig: Record<string, unknown> = {
        method,
        base_url: baseUrl.trim(),
        allowed_hosts: splitCsv(allowedHosts).map(normalizeHost),
      };
      if (pathTemplate.trim()) httpConfig.path_template = pathTemplate.trim();
      const cleanHeaders: Record<string, string> = {};
      for (const row of headers) {
        if (row.key.trim()) cleanHeaders[row.key.trim()] = row.value;
      }
      if (Object.keys(cleanHeaders).length > 0) httpConfig.headers = cleanHeaders;
      if (authSecret) httpConfig.auth = { type: "bearer_secret", secret_name: authSecret };
      if (timeoutMs.trim()) httpConfig.timeout_ms = Number(timeoutMs);
      httpConfig.idempotent = idempotent;
      if (parameters) httpConfig.parameters = parameters;
      return httpConfig;
    }
    const mcpConfig: Record<string, unknown> = {
      server_url: serverUrl.trim(),
      allowed_tool_names: splitCsv(allowedToolNames),
    };
    if (parameters) mcpConfig.parameters = parameters;
    return mcpConfig;
  }

  function buildParameters(): Record<string, unknown> | undefined {
    const cleanRows = paramRows.filter((row) => row.name.trim());
    if (cleanRows.length === 0) return undefined;
    const properties: Record<string, Record<string, unknown>> = {};
    const required: string[] = [];
    for (const row of cleanRows) {
      const prop: Record<string, unknown> = { type: row.type };
      if (row.description.trim()) prop.description = row.description.trim();
      const enumValues = splitCsv(row.enumValues);
      if (enumValues.length > 0) prop.enum = enumValues;
      properties[row.name.trim()] = prop;
      if (row.required) required.push(row.name.trim());
    }
    const schema: Record<string, unknown> = { type: "object", properties };
    if (required.length > 0) schema.required = required;
    return schema;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name.trim()) {
      setError("Tool name is required.");
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(name.trim())) {
      setError(
        "Tool name must start with a letter and contain only letters, numbers, and underscores.",
      );
      return;
    }
    if (kind === "http") {
      if (!baseUrl.trim()) {
        setError("Base URL is required for HTTP tools.");
        return;
      }
      if (splitCsv(allowedHosts).length === 0) {
        setError("At least one allowed host is required (comma-separated).");
        return;
      }
    } else {
      if (!serverUrl.trim()) {
        setError("Server URL is required for MCP tools.");
        return;
      }
      if (splitCsv(allowedToolNames).length === 0) {
        setError("At least one allowed MCP tool name is required.");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      kind,
      config: buildConfig(),
    };
    const res = tool
      ? await updateCustomTool(workspaceId, tool.id, payload)
      : await createCustomTool(workspaceId, payload);
    setIsSubmitting(false);

    if (res.tool) {
      onSaved(res.tool);
      onClose();
    } else {
      setError(res.error?.message || "Failed to save tool.");
    }
  }

  const inputClass =
    "w-full rounded-10 border border-border-faint bg-white px-3 py-2 text-xs text-accent-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-heat-24 focus:border-heat-40 transition-shadow";
  const labelClass = "block text-xs font-semibold text-accent-black";

  const headerRows = useMemo(
    () =>
      headers.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={row.key}
            onChange={(e) =>
              setHeaders((prev) =>
                prev.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)),
              )
            }
            placeholder="Header name (e.g. x-client-id)"
            className={inputClass}
          />
          <input
            type="text"
            value={row.value}
            onChange={(e) =>
              setHeaders((prev) =>
                prev.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)),
              )
            }
            placeholder="Value"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setHeaders((prev) => prev.filter((_, i) => i !== index))}
            className="p-2 rounded-8 text-neutral-400 hover:text-accent-crimson hover:bg-red-50 transition-colors shrink-0"
            aria-label="Remove header"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )),
    [headers],
  );

  const paramRowInputs = paramRows.map((row, index) => (
    <div
      key={index}
      className="space-y-2 p-3 rounded-10 border border-border-faint bg-neutral-50/50"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={row.name}
          onChange={(e) =>
            setParamRows((prev) =>
              prev.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)),
            )
          }
          placeholder="param_name"
          className={`${inputClass} font-mono`}
        />
        <select
          value={row.type}
          onChange={(e) =>
            setParamRows((prev) =>
              prev.map((r, i) => (i === index ? { ...r, type: e.target.value } : r)),
            )
          }
          className={inputClass}
        >
          {PARAM_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setParamRows((prev) => prev.filter((_, i) => i !== index))}
          className="p-2 rounded-8 text-neutral-400 hover:text-accent-crimson hover:bg-red-50 transition-colors shrink-0"
          aria-label="Remove parameter"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={row.description}
          onChange={(e) =>
            setParamRows((prev) =>
              prev.map((r, i) => (i === index ? { ...r, description: e.target.value } : r)),
            )
          }
          placeholder="Description (optional)"
          className={inputClass}
        />
        <input
          type="text"
          value={row.enumValues}
          onChange={(e) =>
            setParamRows((prev) =>
              prev.map((r, i) => (i === index ? { ...r, enumValues: e.target.value } : r)),
            )
          }
          placeholder="enum: a, b, c (optional)"
          className={inputClass}
        />
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 whitespace-nowrap">
          <input
            type="checkbox"
            checked={row.required}
            onChange={(e) =>
              setParamRows((prev) =>
                prev.map((r, i) => (i === index ? { ...r, required: e.target.checked } : r)),
              )
            }
            className="accent-heat-100 w-3.5 h-3.5"
          />
          Required
        </label>
      </div>
    </div>
  ));

  return (
    <SettingsDialog
      open={open}
      onClose={handleClose}
      title={editing ? "Edit custom tool" : "Add custom tool"}
      isSubmitting={isSubmitting}
      maxWidthClass="max-w-[640px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="ct-name" className={labelClass}>
              Name
            </label>
            <input
              id="ct-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. order_lookup"
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ct-kind" className={labelClass}>
              Kind
            </label>
            <select
              id="ct-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as CustomToolKind)}
              className={inputClass}
            >
              <option value="http">HTTP API</option>
              <option value="mcp">MCP server</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ct-description" className={labelClass}>
            Description
          </label>
          <input
            id="ct-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this tool does — shown to the model"
            className={inputClass}
          />
        </div>

        {kind === "http" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="ct-method" className={labelClass}>
                  Method
                </label>
                <select
                  id="ct-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={inputClass}
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="ct-base" className={labelClass}>
                  Base URL
                </label>
                <input
                  id="ct-base"
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ct-hosts" className={labelClass}>
                Allowed hosts
              </label>
              <input
                id="ct-hosts"
                type="text"
                value={allowedHosts}
                onChange={(e) => setAllowedHosts(e.target.value)}
                placeholder="api.example.com, api2.example.com"
                className={`${inputClass} font-mono`}
              />
              <p className="text-[11px] text-neutral-500">
                Comma-separated hostnames like <span className="font-mono">dummyjson.com</span> —
                pasted URLs are reduced to their hostname. Private hosts are rejected.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ct-path" className={labelClass}>
                Path template
              </label>
              <input
                id="ct-path"
                type="text"
                value={pathTemplate}
                onChange={(e) => setPathTemplate(e.target.value)}
                placeholder="/orders/{order_id}"
                className={`${inputClass} font-mono`}
              />
              <p className="text-[11px] text-neutral-500">
                {`{placeholders}`} are filled from the arguments the model passes.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className={labelClass}>Static headers</span>
              {headerRows}
              <button
                type="button"
                onClick={() => setHeaders((prev) => [...prev, { key: "", value: "" }])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 border border-border-faint bg-white text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add header</span>
              </button>
              <p className="text-[11px] text-neutral-500">
                Authorization headers are blocked here — use the secret below instead.
              </p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ct-auth" className={labelClass}>
                Bearer token (workspace secret)
              </label>
              <select
                id="ct-auth"
                value={authSecret}
                onChange={(e) => setAuthSecret(e.target.value)}
                className={inputClass}
              >
                <option value="">No authentication</option>
                {secretNames.map((secret) => (
                  <option key={secret} value={secret}>
                    {secret}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-neutral-500">
                The runtime fetches this secret at call time and sends it as a Bearer token.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="ct-timeout" className={labelClass}>
                  Timeout (ms)
                </label>
                <input
                  id="ct-timeout"
                  type="number"
                  min={1000}
                  max={60000}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(e.target.value)}
                  placeholder="30000"
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600 self-end pb-1">
                <input
                  type="checkbox"
                  checked={idempotent}
                  onChange={(e) => setIdempotent(e.target.checked)}
                  className="accent-heat-100 w-3.5 h-3.5"
                />
                Idempotent (safe to retry on timeout)
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="ct-server" className={labelClass}>
                Server URL
              </label>
              <input
                id="ct-server"
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://mcp.example.com/sse"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ct-mcp-tools" className={labelClass}>
                Allowed MCP tool names
              </label>
              <input
                id="ct-mcp-tools"
                type="text"
                value={allowedToolNames}
                onChange={(e) => setAllowedToolNames(e.target.value)}
                placeholder="create_ticket, list_tickets"
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={labelClass}>Parameters (JSON schema)</span>
            <button
              type="button"
              onClick={() =>
                setParamRows((prev) => [
                  ...prev,
                  { name: "", type: "string", description: "", required: false, enumValues: "" },
                ])
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-8 border border-border-faint bg-white text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add parameter</span>
            </button>
          </div>
          {paramRowInputs.length > 0 && <div className="space-y-2">{paramRowInputs}</div>}
          <p className="text-[11px] text-neutral-500">
            Declare the arguments the model can pass when calling this tool.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-10 text-xs text-accent-crimson"
          >
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-faint">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 border border-border-faint bg-white text-xs font-semibold text-accent-black hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-10 bg-heat-100 text-white text-xs font-semibold hover:bg-heat-100/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : editing ? "Save changes" : "Add tool"}
          </button>
        </div>
      </form>
    </SettingsDialog>
  );
}
