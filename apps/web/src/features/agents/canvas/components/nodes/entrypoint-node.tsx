import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { LogIn } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { EntrypointNodeConfig } from "@quickstart/contracts";

export const EntrypointNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as EntrypointNodeConfig) ?? {
    allowed_channels: ["chat", "voice"],
  };

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "Start Interaction"}
      typeBadge="Entry"
      icon={<LogIn className="w-4 h-4" />}
      iconBgColor="bg-blue-50 text-[#2A6DFB]"
      hasInput={false}
      hasErrors={data.hasErrors}
      errorMessage={data.errorMessage}
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={
        <CanvasPortRow
          id="interaction_received"
          type="source"
          label="Interaction Received"
          badge="Trigger"
        />
      }
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {config.allowed_channels?.map((ch) => (
            <span
              key={ch}
              className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 uppercase"
            >
              {ch}
            </span>
          ))}
        </div>

        {config.visitor_metadata_fields && config.visitor_metadata_fields.length > 0 && (
          <div className="text-[11px] text-neutral-500">
            <span className="font-medium text-neutral-700">Metadata:</span>{" "}
            {config.visitor_metadata_fields.join(", ")}
          </div>
        )}
      </div>
    </CanvasNodeFrame>
  );
});

EntrypointNode.displayName = "EntrypointNode";
