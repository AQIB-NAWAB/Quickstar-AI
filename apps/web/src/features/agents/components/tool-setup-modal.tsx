"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { AgentToolDefinition } from "../lib/types";

export type ToolTemplate = {
  id: string;
  name: string;
  label: string;
  description: string;
  defaultMethod: "GET" | "POST";
  defaultPathTemplate: string;
  defaultParameters: Record<string, unknown>;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  template: ToolTemplate | null;
  onSaveTool: (tool: AgentToolDefinition) => void;
};

export function ToolSetupModal({
  isOpen,
  onClose,
  template,
  onSaveTool,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [baseUrl, setBaseUrl] = useState("");
  const [pathTemplate, setPathTemplate] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [idempotent, setIdempotent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !template) return;
    setName(template.name);
    setDescription(template.description);
    setMethod(template.defaultMethod);
    setPathTemplate(template.defaultPathTemplate);
    setBaseUrl("");
    setTimeoutMs(30000);
    setIdempotent(template.defaultMethod === "GET");
    setError(null);
    setTimeout(() => urlInputRef.current?.focus(), 50);
  }, [isOpen, template]);

  if (!isOpen || !template) return null;

  function handleSave() {
    if (!template) return;
    setError(null);
    const trimmedUrl = baseUrl.trim();
    if (!trimmedUrl) {
      setError("Please provide a valid Base URL for this HTTP tool.");
      urlInputRef.current?.focus();
      return;
    }

    let hostname = "";
    try {
      const parsed = new URL(trimmedUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Invalid protocol");
      }
      hostname = parsed.hostname;
    } catch {
      setError("Base URL must be a valid HTTP or HTTPS URL (e.g. https://api.mycompany.com).");
      urlInputRef.current?.focus();
      return;
    }

    const toolDef: AgentToolDefinition = {
      id: `tool_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      description: description.trim(),
      type: "http",
      method,
      base_url: trimmedUrl,
      path_template: pathTemplate.trim() || undefined,
      allowed_hosts: [hostname],
      timeout_ms: Math.min(60000, Math.max(1000, timeoutMs)),
      idempotent,
      parameters: template.defaultParameters,
    };

    onSaveTool(toolDef);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-setup-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div className="w-full max-w-[560px] bg-white rounded-xl border border-[#E1E5EA] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#EDF0F2] flex items-start justify-between shrink-0">
          <div>
            <h2 id="tool-setup-title" className="text-[17px] font-semibold text-[#202125]">
              Set up {template.label}
            </h2>
            <p className="mt-0.5 text-[13px] text-[#667085]">
              Configure the HTTP connection endpoint for this tool.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-[13px]">
          {error && (
            <div className="p-3 text-[12px] text-[#B42318] bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium text-[#202125] mb-1">Tool name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 font-mono text-[13px] text-[#202125] bg-white border border-[#E1E5EA] rounded-lg focus:outline-hidden focus:border-[#F15A24]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#202125] mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-[13px] text-[#202125] bg-white border border-[#E1E5EA] rounded-lg focus:outline-hidden focus:border-[#F15A24]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-[#202125] mb-1">HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
                className="w-full px-3 py-2 text-[13px] text-[#202125] bg-white border border-[#E1E5EA] rounded-lg focus:outline-hidden focus:border-[#F15A24]"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-[#202125] mb-1">
                Base URL <span className="text-[#F15A24]">*</span>
              </label>
              <input
                ref={urlInputRef}
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="w-full px-3 py-2 font-mono text-[13px] text-[#202125] bg-white border border-[#E1E5EA] rounded-lg focus:outline-hidden focus:border-[#F15A24]"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#202125] mb-1">Path template (optional)</label>
            <input
              type="text"
              value={pathTemplate}
              onChange={(e) => setPathTemplate(e.target.value)}
              placeholder="/v1/search"
              className="w-full px-3 py-2 font-mono text-[13px] text-[#202125] bg-white border border-[#E1E5EA] rounded-lg focus:outline-hidden focus:border-[#F15A24]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="idempotent-tool"
              type="checkbox"
              checked={idempotent}
              onChange={(e) => setIdempotent(e.target.checked)}
              className="w-4 h-4 rounded text-[#F15A24] border-[#D0D5DD] focus:ring-[#F15A24]"
            />
            <label htmlFor="idempotent-tool" className="text-[13px] text-[#344054] cursor-pointer">
              Safe to retry (idempotent operation)
            </label>
          </div>

          <div className="p-3 bg-[#FAFBFB] border border-[#EDF0F2] rounded-lg text-[11px] text-[#667085] leading-relaxed">
            Note: Adding this tool attaches it to your agent draft. Remember to save and publish your agent to activate tool execution.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#EDF0F2] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-[13px] font-medium text-[#202125] bg-white border border-[#E1E5EA] rounded-md hover:bg-[#F8F9FA]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-[#F15A24] hover:bg-[#C94716] rounded-md shadow-xs"
          >
            Attach tool
          </button>
        </div>
      </div>
    </div>
  );
}
