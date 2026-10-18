"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, GitBranch, Globe, Headphones, Bell, Tag, FileText, Square } from "lucide-react";
import { workflowOutputPorts } from "@quickstart/contracts";
const definitions = {
  trigger: { icon: Zap, label: "Trigger", color: "bg-orange-50 text-[#FA5D19]" },
  condition: { icon: GitBranch, label: "Condition", color: "bg-amber-50 text-amber-600" },
  webhook: { icon: Globe, label: "HTTP request", color: "bg-sky-50 text-sky-600" },
  agent_handoff: { icon: Headphones, label: "Human handoff", color: "bg-teal-50 text-teal-600" },
  notification: { icon: Bell, label: "Notification", color: "bg-orange-50 text-[#FA5D19]" },
  update_tags: { icon: Tag, label: "Tags", color: "bg-amber-50 text-amber-600" },
  log: { icon: FileText, label: "Log", color: "bg-neutral-100 text-neutral-500" },
  end: { icon: Square, label: "End", color: "bg-neutral-100 text-neutral-500" },
};
const labels: Record<string, string> = {
  received: "Received",
  matched: "Matched",
  not_matched: "Not matched",
  success: "Success",
  error: "Error",
  next: "Next",
};
function component(type: keyof typeof definitions) {
  return memo(function WorkflowNode({ data, selected }: NodeProps) {
    const d = definitions[type],
      Icon = d.icon,
      c = (data.config as Record<string, any>) ?? {},
      ports = workflowOutputPorts(type);
    let summary = "";
    switch (type) {
      case "trigger":
        summary = c.event_type ?? "Choose event";
        break;
      case "condition":
        summary = `${(c.root_group?.children ?? c.root_group?.rules ?? []).length} rules · ${String(c.root_group?.logic ?? "and").toUpperCase()}`;
        break;
      case "webhook":
        summary = `${c.method ?? "POST"} · ${c.url ? String(c.url).replace(/^https?:\/\//, "") : "Configure endpoint"}`;
        break;
      case "agent_handoff":
        summary = c.queue_name || c.queue_id || "Choose an operator queue";
        break;
      case "notification":
        summary = `${c.delivery ?? "inbox"} · ${(c.recipients ?? []).length} recipients`;
        break;
      case "update_tags":
        summary = (c.tags ?? []).join(", ") || "Choose tags";
        break;
      case "log":
        summary = c.message || "Record error details";
        break;
      case "end":
        summary = c.reason || "No further actions";
        break;
    }
    return (
      <div
        className={`w-[230px] rounded-lg border bg-white text-neutral-800 shadow-sm ${selected ? "border-[#FA5D19] ring-1 ring-orange-100" : "border-[#E8E9EB]"}`}
      >
        {type !== "trigger" && (
          <Handle
            type="target"
            id="in"
            position={Position.Left}
            className="!h-2.5 !w-2.5 !border !border-neutral-400 !bg-white"
          />
        )}
        <div className="flex items-center gap-3 px-3 py-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${d.color}`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-wide text-neutral-500">{d.label}</div>
            <div className="truncate text-[13px] font-semibold">{String(data.name ?? d.label)}</div>
            <div className="mt-1 truncate text-[10px] text-neutral-500" title={summary}>
              {summary}
            </div>
          </div>
        </div>
        {ports.length > 1 && (
          <div className="border-t border-neutral-100 px-3 py-1 text-right text-[9px] text-neutral-500">
            {ports.map((port) => (
              <div key={port} className="relative py-1">
                {labels[port]}
                <Handle
                  type="source"
                  id={port}
                  position={Position.Right}
                  className="!h-2.5 !w-2.5 !border !border-neutral-400 !bg-white !-right-[18px]"
                />
              </div>
            ))}
          </div>
        )}
        {ports.length === 1 && (
          <Handle
            type="source"
            id={ports[0]}
            position={Position.Right}
            className="!h-2.5 !w-2.5 !border !border-neutral-400 !bg-white"
          />
        )}
      </div>
    );
  });
}
export const WORKFLOW_CUSTOM_NODE_TYPES = {
  trigger: component("trigger"),
  condition: component("condition"),
  webhook: component("webhook"),
  agent_handoff: component("agent_handoff"),
  notification: component("notification"),
  update_tags: component("update_tags"),
  log: component("log"),
  end: component("end"),
};
