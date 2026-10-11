"use client";

import { Plus } from "lucide-react";
import { useRef,useState } from "react";
import { EVENT_CATALOG,getEventCatalogItem } from "../../lib/event-catalog";
import type { WebhookActionConfig } from "../../lib/types";

interface WebhookActionFormProps {
  config: WebhookActionConfig;
  triggerEventType?: string;
  onChange: (updated: WebhookActionConfig) => void;
}

export function WebhookActionForm({
  config,
  triggerEventType,
  onChange,
}: WebhookActionFormProps) {
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);

  const isGet = config.method === "GET";

  const eventItem = triggerEventType ? getEventCatalogItem(triggerEventType) : EVENT_CATALOG[0];
  const availableFields = eventItem?.availableFields ?? [];

  function handleInsertField(path: string) {
    const textarea = bodyTextareaRef.current;
    const tag = `{{${path}}}`;
    if (!textarea) {
      onChange({ ...config, body: (config.body || "") + tag });
      setFieldPickerOpen(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = config.body || "";
    const updated = text.substring(0, start) + tag + text.substring(end);

    onChange({ ...config, body: updated });
    setFieldPickerOpen(false);

    // Restore caret
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + tag.length;
      textarea.selectionEnd = start + tag.length;
    }, 10);
  }

  return (
    <div className="space-y-4 text-xs">

      {/* Method & Webhook URL */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        <div className="sm:col-span-1 space-y-1">
          <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
            Method
          </label>
          <select
            value={config.method}
            onChange={(e) =>
              onChange({
                ...config,
                method: e.target.value as WebhookActionConfig["method"],
              })
            }
            className="w-full px-2.5 py-1.5 text-xs font-mono font-medium rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
          >
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="GET">GET</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
            Webhook URL
          </label>
          <input
            type="url"
            value={config.url}
            onChange={(e) => onChange({ ...config, url: e.target.value })}
            placeholder="https://notify.example.com/endpoint"
            className="w-full px-3 py-1.5 text-xs font-mono rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
          />
        </div>
      </div>

      {/* Authentication */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
          Authentication
        </label>
        <select
          value={config.authType}
          onChange={(e) =>
            onChange({
              ...config,
              authType: e.target.value as "none" | "secret",
            })
          }
          className="w-full px-3 py-1.5 text-xs rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
        >
          <option value="none">None</option>
          <option value="secret">Secret reference</option>
        </select>
      </div>

      {/* Secret Name when authType === secret */}
      {config.authType === "secret" && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
            Secret name
          </label>
          <input
            type="text"
            value={config.secretName || ""}
            onChange={(e) => onChange({ ...config, secretName: e.target.value })}
            placeholder="e.g. SUPPORT_WEBHOOK_TOKEN"
            className="w-full px-3 py-1.5 text-xs font-mono rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white"
          />
          <p className="text-[11px] text-neutral-400">
            Stored secret values are never shown.
          </p>
        </div>
      )}

      {/* Request Body (Disabled for GET) */}
      {!isGet && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider block">
              Request body
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFieldPickerOpen(!fieldPickerOpen)}
                className="text-[11px] text-heat-100 hover:text-heat-100/90 font-medium inline-flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Insert event field</span>
              </button>

              {fieldPickerOpen && (
                <div className="absolute right-0 top-6 z-30 w-56 bg-white border border-border-faint rounded-8 shadow-lg p-1.5 space-y-1">
                  <p className="text-[10px] font-semibold text-neutral-400 px-2 py-1 uppercase tracking-wider">
                    Available event fields
                  </p>
                  {availableFields.map((f) => (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => handleInsertField(f.path)}
                      className="w-full text-left px-2 py-1 rounded text-[11px] font-mono hover:bg-neutral-50 text-accent-black flex flex-col"
                    >
                      <span className="font-semibold text-heat-100">{`{{${f.path}}}`}</span>
                      <span className="text-[10px] text-neutral-400 font-sans">{f.label}</span>
                    </button>
                  ))}
                  {availableFields.length === 0 && (
                    <p className="text-[11px] text-neutral-400 px-2 py-1 italic">
                      No schema fields declared.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <textarea
            ref={bodyTextareaRef}
            rows={5}
            value={config.body || ""}
            onChange={(e) => onChange({ ...config, body: e.target.value })}
            placeholder='{\n  "conversation_id": "{{event.conversation_id}}"\n}'
            className="w-full px-3 py-2 text-xs font-mono rounded-8 border border-neutral-300 focus:outline-none focus:border-heat-100 focus:ring-1 focus:ring-heat-100 text-accent-black bg-white leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}
