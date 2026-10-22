import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { UserCheck } from "lucide-react";
import { CanvasNodeFrame } from "../canvas-node-frame";
import { CanvasPortRow } from "../canvas-port-row";
import type { CanvasFlowNode } from "../../lib/types";
import type { HumanHandoffNodeConfig } from "@quickstart/contracts";

export const HumanHandoffNode: React.FC<NodeProps<CanvasFlowNode>> = memo((props) => {
  const { id, selected, data } = props;
  const config = (data.config as HumanHandoffNodeConfig) ?? {
    handoff_message: "Transferring to a human teammate...",
    queue_name: "default",
    pause_ai: true,
  };

  return (
    <CanvasNodeFrame
      id={id}
      selected={selected}
      title={data.label || "Human Handoff"}
      typeBadge="Handoff"
      icon={<UserCheck className="w-4 h-4" />}
      iconBgColor="bg-emerald-50 text-emerald-600"
      hasInput={true}
      hasErrors={data.hasErrors}
      errorMessage={data.errorMessage}
      isExecuting={data.isExecuting}
      onDuplicate={data.onDuplicate ? () => data.onDuplicate!(id) : undefined}
      onDelete={data.onDelete ? () => data.onDelete!(id) : undefined}
      footer={
        <CanvasPortRow id="resumed" type="source" label="On Operator Release" badge="Resume" />
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>
            Queue: <strong className="text-neutral-700">{config.queue_name || "default"}</strong>
          </span>
          <span className="text-[10px] bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded font-medium">
            AI Paused
          </span>
        </div>

        <p className="text-xs text-neutral-700 bg-neutral-50 p-2 rounded-md border border-neutral-100 line-clamp-2">
          {config.handoff_message || "Transferring to human support..."}
        </p>
      </div>
    </CanvasNodeFrame>
  );
});

HumanHandoffNode.displayName = "HumanHandoffNode";
