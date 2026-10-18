import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Globe, ShieldCheck } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { HttpRequestNodeConfig } from "@quickstart/contracts";

export const HttpRequestNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as HttpRequestNodeConfig) ?? {
    tool_id: "",
    method: "GET",
    url: "",
  };

  const isConfigured = Boolean(config.tool_id || config.url);

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "HTTP Tool / Action"}
      typeBadge="Tool"
      icon={<Globe className="w-4 h-4" />}
      iconBgColor="bg-orange-50 text-[#FA5D19]"
      hasInput={true}
      hasErrors={data.hasErrors || !isConfigured}
      errorMessage={
        data.errorMessage || (!isConfigured ? "Select a workspace tool to execute" : undefined)
      }
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={
        <div className="flex flex-col divide-y divide-neutral-100">
          <CanvasPortRow id="success" type="source" label="Tool Succeeded" badge="Success" />
          <CanvasPortRow id="failure" type="source" label="Tool Failed / Rejected" badge="Error" />
        </div>
      }
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-cyan-100 text-cyan-800 font-mono">
            {config.method || "POST"}
          </span>
          <span className="text-xs text-neutral-800 font-mono truncate">
            {config.tool_id
              ? `Tool #${config.tool_id.slice(0, 8)}`
              : config.url || "Unconfigured tool"}
          </span>
        </div>

        {config.require_confirmation && (
          <div className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Requires visitor confirmation</span>
          </div>
        )}

        <div className="text-[10px] text-neutral-500 flex justify-between">
          <span>Output:</span>
          <span className="font-mono text-neutral-700">
            {config.output_variable ? `{{ ${config.output_variable} }}` : "None"}
          </span>
        </div>
      </div>
    </CanvasNodeFrame>
  );
});

HttpRequestNode.displayName = "HttpRequestNode";
