"use client";

import React, { useState } from "react";
import { Globe, X, Play, Braces, Plus, Trash2, ShieldAlert } from "lucide-react";
import type { WorkflowNode } from "../../lib/types";

export type HttpInspectorProps = {
  node: WorkflowNode;
  onUpdateConfig: (config: Record<string, any>) => void;
  onUpdateName: (name: string) => void;
  onClose: () => void;
  onOpenVariablePicker?: (onSelect: (path: string) => void) => void;
  onTestStep?: () => void;
};

export const HttpInspector: React.FC<HttpInspectorProps> = ({
  node,
  onUpdateConfig,
  onUpdateName,
  onClose,
  onOpenVariablePicker,
  onTestStep,
}) => {
  const cfg = (node.config as Record<string, any>) || {};
  const [activeTab, setActiveTab] = useState<"body" | "headers" | "auth" | "settings">("body");

  const method = (cfg.method || "POST").toUpperCase();
  const url = cfg.url || "";
  const body = cfg.body || "";
  const authType = cfg.auth_type || "none";
  const headers = (cfg.headers as Record<string, string>) || {};

  const updateHeader = (key: string, value: string) => {
    onUpdateConfig({
      ...cfg,
      headers: { ...headers, [key]: value },
    });
  };

  const removeHeader = (key: string) => {
    const copy = { ...headers };
    delete copy[key];
    onUpdateConfig({ ...cfg, headers: copy });
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-neutral-200 w-[420px] select-none text-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">HTTP Request</h3>
            <p className="text-[11px] text-neutral-500">Call an external webhook or internal API</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {/* Step Name */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Step Name</label>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdateName(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-[#FA5D19]"
            placeholder="e.g. Sync lead to HubSpot"
          />
        </div>

        {/* Method & URL */}
        <div className="space-y-1.5">
          <label className="font-semibold text-neutral-700">Endpoint URL</label>
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => onUpdateConfig({ ...cfg, method: e.target.value })}
              className="w-24 px-2 py-2 border border-neutral-300 rounded-lg text-xs font-bold bg-neutral-50 outline-none"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
            <div className="relative flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => onUpdateConfig({ ...cfg, url: e.target.value })}
                placeholder="https://api.example.com/v1/..."
                className="w-full pl-3 pr-8 py-2 border border-neutral-300 rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-[#FA5D19]"
              />
              {onOpenVariablePicker && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenVariablePicker((path) =>
                      onUpdateConfig({ ...cfg, url: `${url}{{${path}}}` }),
                    )
                  }
                  className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-700"
                  title="Insert variable"
                >
                  <Braces className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-neutral-200">
          {(["body", "headers", "auth", "settings"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab
                  ? "border-[#FA5D19] text-[#FA5D19]"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab: Request Body */}
        {activeTab === "body" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                JSON Request Body (supports &#123;&#123;variables&#125;&#125;)
              </span>
              {onOpenVariablePicker && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenVariablePicker((path) =>
                      onUpdateConfig({ ...cfg, body: `${body}{{${path}}}` }),
                    )
                  }
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#FA5D19] hover:underline"
                >
                  <Braces className="w-3.5 h-3.5" />
                  <span>Insert Variable</span>
                </button>
              )}
            </div>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => onUpdateConfig({ ...cfg, body: e.target.value })}
              placeholder={
                '{\n  "conversation_id": "{{event.conversation_id}}",\n  "text": "{{event.message.text}}"\n}'
              }
              className="w-full p-3 font-mono text-[11px] border border-neutral-300 rounded-lg outline-none focus:ring-1 focus:ring-[#FA5D19] leading-relaxed bg-neutral-900 text-neutral-100"
            />
          </div>
        )}

        {/* Tab: Headers */}
        {activeTab === "headers" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-700">Custom HTTP Headers</span>
              <button
                type="button"
                onClick={() =>
                  updateHeader(`X-Custom-Header-${Date.now().toString().slice(-4)}`, "value")
                }
                className="flex items-center gap-1 text-[11px] font-semibold text-[#FA5D19] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Header</span>
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(headers).map(([key, value]) => (
                <div key={key} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={key}
                    readOnly
                    className="w-1/3 px-2 py-1.5 border border-neutral-300 rounded-md text-[11px] font-mono bg-neutral-50"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateHeader(key, e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-neutral-300 rounded-md text-[11px] font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(key)}
                    className="p-1 text-neutral-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {Object.keys(headers).length === 0 && (
                <p className="text-neutral-400 italic text-[11px] p-2 text-center">
                  Default headers: Content-Type: application/json, X-QuickStart-Event-Id
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab: Auth */}
        {activeTab === "auth" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-700">Authentication Type</label>
              <select
                value={authType}
                onChange={(e) => onUpdateConfig({ ...cfg, auth_type: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white outline-none"
              >
                <option value="none">None / Public API</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth (Username / Password)</option>
                <option value="secret">Secret Vault Reference</option>
              </select>
            </div>

            {authType === "bearer" && (
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700">Bearer Token</label>
                <input
                  type="password"
                  value={cfg.token || ""}
                  onChange={(e) => onUpdateConfig({ ...cfg, token: e.target.value })}
                  placeholder="e.g. sk_live_... or {{event.token}}"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none"
                />
              </div>
            )}

            {authType === "basic" && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Username</label>
                  <input
                    type="text"
                    value={cfg.username || ""}
                    onChange={(e) => onUpdateConfig({ ...cfg, username: e.target.value })}
                    placeholder="API key or username"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Password</label>
                  <input
                    type="password"
                    value={cfg.password || ""}
                    onChange={(e) => onUpdateConfig({ ...cfg, password: e.target.value })}
                    placeholder="Secret or password"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>
            )}

            {authType === "secret" && (
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700">Secret Vault Key Name</label>
                <input
                  type="text"
                  value={cfg.secret_ref || cfg.connection_credential_id || ""}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...cfg,
                      secret_ref: e.target.value,
                      connection_credential_id: e.target.value,
                    })
                  }
                  placeholder="e.g. integration_slack_credentials or HUBSPOT_API_KEY"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono outline-none"
                />
                <p className="text-[11px] text-neutral-500">
                  Secret values are resolved securely at runtime via secrets-service and injected into headers.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Settings */}
        {activeTab === "settings" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-neutral-700">Timeout (milliseconds)</label>
              <input
                type="number"
                value={cfg.timeout_ms ?? 5000}
                onChange={(e) =>
                  onUpdateConfig({ ...cfg, timeout_ms: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs outline-none"
              />
            </div>

            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-neutral-800">Automatic Retries</span>
                <input
                  type="checkbox"
                  checked={cfg.retry_policy?.enabled ?? false}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...cfg,
                      retry_policy: {
                        ...(cfg.retry_policy || {}),
                        enabled: e.target.checked,
                        max_attempts: 3,
                      },
                    })
                  }
                  className="rounded text-[#FA5D19] focus:ring-[#FA5D19]"
                />
              </label>
              {cfg.retry_policy?.enabled && (
                <div className="pt-2 border-t border-neutral-200 text-[11px] text-neutral-600">
                  Retries transient 5xx errors up to 3 attempts with exponential backoff.
                </div>
              )}
            </div>

            <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Failure Path Routing</span>
              </div>
              <p className="text-[11px] text-neutral-600">
                Connect the red "On Error" output handle to handle failed HTTP calls or fallback
                actions.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">Ports: Success & On Error</span>
        {onTestStep && (
          <button
            onClick={onTestStep}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Simulate workflow</span>
          </button>
        )}
      </div>
    </div>
  );
};
